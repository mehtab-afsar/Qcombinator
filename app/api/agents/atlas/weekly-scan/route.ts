import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'
import { withCircuitBreaker } from '@/lib/circuit-breaker'

// POST /api/agents/atlas/weekly-scan  — user-triggered scan (authenticated)
// GET  /api/agents/atlas/weekly-scan  — cron-triggered scan (all founders, CRON_SECRET)

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Core scan logic (shared between GET cron and POST user-triggered) ─────────

async function runScanForUser(userId: string, admin: ReturnType<typeof getAdmin>, tavilyKey: string | undefined) {
  // Fetch all tracked competitors for this user
  const { data: competitors } = await admin
    .from('tracked_competitors')
    .select('id, name, url, last_snapshot, tracked_at')
    .eq('user_id', userId)
    .order('tracked_at', { ascending: false })
    .limit(8)

  if (!competitors || competitors.length === 0) {
    return { skipped: true, reason: 'no tracked competitors' }
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
      currentData = await withCircuitBreaker('tavily', async () => {
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
        if (!res.ok) return ''
        const data = await res.json()
        return (data.results ?? [])
          .slice(0, 3)
          .map((r: { title: string; content: string; url: string }) => `${r.title}: ${r.content?.slice(0, 300)}`)
          .join('\n')
      }, '')
    }

    if (!currentData && tavilyKey) {
      currentData = await withCircuitBreaker('tavily', async () => {
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
        if (!res.ok) return ''
        const data = await res.json()
        return (data.results ?? [])
          .slice(0, 3)
          .map((r: { title: string; content: string }) => `${r.title}: ${r.content?.slice(0, 300)}`)
          .join('\n')
      }, '')
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
      user_id:       userId,
      agent_id:      'atlas',
      artifact_type: 'weekly_briefing',
      title:         `Competitive Weekly Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      content:       digestContent,
    })
    .select('id, title, content, created_at')
    .single()

  if (insertErr) {
    console.error(`Atlas weekly scan insert error for user ${userId}:`, insertErr)
    return { error: 'Failed to save digest' }
  }

  // Log activity
  await admin.from('agent_activity').insert({
    user_id:     userId,
    agent_id:    'atlas',
    action_type: 'weekly_scan',
    description: `Weekly competitive scan — ${competitors.length} competitors, ${scanResults.filter(r => r.hasChanges).length} with changes`,
    metadata:    { competitorsScanned: competitors.length },
  })

  // Update startup_state competitor count
  await admin
    .from('startup_state')
    .upsert({
      user_id:               userId,
      competitor_count:      competitors.length,
      last_competitor_scan:  new Date().toISOString(),
      last_updated_by:       'atlas',
      updated_at:            new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return {
    digest: digestContent,
    artifact,
    scanned: competitors.length,
    withChanges: scanResults.filter(r => r.hasChanges).length,
  }
}

// ── GET — Vercel Cron handler (runs for ALL founders) ─────────────────────────

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const tavilyKey = process.env.TAVILY_API_KEY

  // Get all founders who have completed onboarding
  const { data: founders, error: listError } = await admin
    .from('founder_profiles')
    .select('user_id')
    .eq('onboarding_completed', true)
    .eq('role', 'founder')
    .limit(500)

  if (listError || !founders) {
    console.error('Atlas cron: failed to list founders:', listError)
    return NextResponse.json({ error: 'Failed to list founders' }, { status: 500 })
  }

  const results = { foundersProcessed: 0, scansRun: 0, skipped: 0, errors: 0 }

  for (const founder of founders) {
    results.foundersProcessed++
    try {
      // Log trigger start
      await admin.from('agent_trigger_log').insert({
        user_id:  founder.user_id,
        agent_id: 'atlas',
        trigger:  'weekly_scan',
        status:   'running',
      })

      const result = await runScanForUser(founder.user_id, admin, tavilyKey)

      if ('skipped' in result) {
        results.skipped++
        await admin
          .from('agent_trigger_log')
          .update({ status: 'done', result: result.reason, completed_at: new Date().toISOString() })
          .eq('user_id', founder.user_id)
          .eq('agent_id', 'atlas')
          .eq('trigger', 'weekly_scan')
          .eq('status', 'running')
      } else if ('error' in result) {
        results.errors++
        await admin
          .from('agent_trigger_log')
          .update({ status: 'failed', result: result.error, completed_at: new Date().toISOString() })
          .eq('user_id', founder.user_id)
          .eq('agent_id', 'atlas')
          .eq('trigger', 'weekly_scan')
          .eq('status', 'running')
      } else {
        results.scansRun++
        await admin
          .from('agent_trigger_log')
          .update({
            status:       'done',
            result:       `Scanned ${result.scanned} competitors, ${result.withChanges} with changes`,
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', founder.user_id)
          .eq('agent_id', 'atlas')
          .eq('trigger', 'weekly_scan')
          .eq('status', 'running')
      }
    } catch (err) {
      console.error(`Atlas cron scan error for user ${founder.user_id}:`, err)
      results.errors++
    }
  }

  return NextResponse.json(results)
}

// ── POST — User-triggered scan (authenticated) ────────────────────────────────

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const tavilyKey = process.env.TAVILY_API_KEY

    const result = await runScanForUser(user.id, admin, tavilyKey)

    if ('skipped' in result) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Atlas weekly scan error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
