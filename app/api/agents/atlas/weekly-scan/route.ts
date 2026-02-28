import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/weekly-scan
// Re-scrapes all tracked competitors via Tavily, diffs against last snapshot,
// and generates a Competitive Weekly Digest artifact.

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const tavilyKey = process.env.TAVILY_API_KEY

    // Fetch all tracked competitors for this user
    const { data: competitors } = await admin
      .from('tracked_competitors')
      .select('id, name, url, last_snapshot, tracked_at')
      .eq('user_id', user.id)
      .order('tracked_at', { ascending: false })
      .limit(8)

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ error: 'No tracked competitors. Track some competitors first.' }, { status: 400 })
    }

    // Scrape each competitor
    const scanResults: {
      name: string
      url: string
      currentData: string
      lastSnapshot: string | null
      hasChanges: boolean
    }[] = []

    for (const comp of competitors) {
      let currentData = ''
      if (tavilyKey && comp.url) {
        try {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `${comp.name} startup news pricing features announcement`,
              max_results: 3,
              search_depth: 'basic',
              include_domains: comp.url ? [new URL(comp.url.startsWith('http') ? comp.url : `https://${comp.url}`).hostname] : undefined,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            currentData = (data.results ?? [])
              .slice(0, 3)
              .map((r: { title: string; content: string; url: string }) =>
                `${r.title}: ${r.content?.slice(0, 300)}`
              )
              .join('\n')
          }
        } catch { /* non-fatal */ }
      }

      if (!currentData) {
        // Fallback: general search
        if (tavilyKey) {
          try {
            const res = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: tavilyKey,
                query: `${comp.name} company news features product update 2026`,
                max_results: 3,
                search_depth: 'basic',
              }),
            })
            if (res.ok) {
              const data = await res.json()
              currentData = (data.results ?? [])
                .slice(0, 3)
                .map((r: { title: string; content: string }) => `${r.title}: ${r.content?.slice(0, 300)}`)
                .join('\n')
            }
          } catch { /* non-fatal */ }
        }
      }

      const lastSnap = comp.last_snapshot as string | null
      const hasChanges = !lastSnap || currentData !== lastSnap

      scanResults.push({
        name: comp.name,
        url: comp.url,
        currentData: currentData || `No new data found for ${comp.name}`,
        lastSnapshot: lastSnap,
        hasChanges,
      })

      // Update snapshot in DB
      if (currentData && hasChanges) {
        await admin
          .from('tracked_competitors')
          .update({ last_snapshot: currentData, tracked_at: new Date().toISOString() })
          .eq('id', comp.id)
      }
    }

    // Build scan context for LLM
    const scanContext = scanResults.map(c => `
## ${c.name}${c.hasChanges ? ' ⚡ [Changes detected]' : ''}
${c.currentData}
${c.lastSnapshot && c.hasChanges ? `\nPrevious: ${c.lastSnapshot.slice(0, 200)}` : ''}`
    ).join('\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Atlas, a competitive intelligence expert. Analyse weekly competitor scan results and produce an actionable digest.

Return ONLY valid JSON:
{
  "headline": "one punchy sentence summarising the biggest competitive development this week",
  "topMoves": [
    {
      "competitor": "competitor name",
      "move": "what they did (1 sentence)",
      "implication": "what it means for you (1 sentence)",
      "urgency": "high|medium|low"
    }
  ],
  "pricingAlerts": ["any pricing changes detected (empty array if none)"],
  "hiringSignals": ["any hiring signals that suggest product direction (empty array if none)"],
  "opportunities": ["2-3 specific opportunities to exploit from this week's intel"],
  "recommendedActions": ["2-3 specific actions to take this week in response"],
  "quietCompetitors": ["competitors with no notable activity this week"]
}`,
        },
        { role: 'user', content: `Weekly competitor scan — week of ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}:\n${scanContext}` },
      ],
      { maxTokens: 900, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      const m = clean.match(/\{[\s\S]*\}/)
      try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} }
    }

    const digestContent = {
      ...parsed,
      scannedAt: new Date().toISOString(),
      competitorsScanned: competitors.length,
      competitorsWithChanges: scanResults.filter(r => r.hasChanges).length,
    }

    // Save as agent artifact
    const { data: artifact, error: insertErr } = await admin
      .from('agent_artifacts')
      .insert({
        user_id:       user.id,
        agent_id:      'atlas',
        artifact_type: 'weekly_briefing',
        title:         `Competitive Weekly Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        content:       digestContent,
      })
      .select('id, title, content, created_at')
      .single()

    if (insertErr) {
      console.error('Atlas weekly scan insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save digest' }, { status: 500 })
    }

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'atlas',
      action_type: 'weekly_scan',
      description: `Weekly competitive scan — ${competitors.length} competitors, ${scanResults.filter(r => r.hasChanges).length} with changes`,
      metadata:    { competitorsScanned: competitors.length },
    })

    return NextResponse.json({
      digest: digestContent,
      artifact,
      scanned: competitors.length,
      withChanges: scanResults.filter(r => r.hasChanges).length,
    })
  } catch (err) {
    console.error('Atlas weekly scan error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
