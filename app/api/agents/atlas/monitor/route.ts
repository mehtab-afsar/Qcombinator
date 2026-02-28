import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/monitor
// Scans tracked competitors for recent changes: new job postings, pricing, funding, product updates.
// No body — pulls tracked_competitors table, uses Tavily for live data.
// Returns: { digest: { competitor, signals[], urgency, actionable }[], summary, mostUrgent }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function tavilySearch(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return ''
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 3 }),
    })
    const j = await res.json() as { results?: { title: string; content: string; url: string }[] }
    return (j.results ?? []).map(r => `${r.title}: ${r.content.slice(0, 200)}`).join('\n')
  } catch { return '' }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [
      { data: fp },
      { data: trackedCompetitors },
      { data: competitiveArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('tracked_competitors').select('name, website, last_checked').eq('user_id', user.id).order('last_checked', { ascending: true }).limit(5),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas').eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const matrix = (competitiveArtifact?.content ?? {}) as Record<string, unknown>

    // Build competitor list from tracked + matrix
    const trackedNames = (trackedCompetitors ?? []).map(c => c.name)
    const matrixCompetitors = (matrix.competitors as { name: string; website?: string }[] | undefined) ?? []
    const allCompetitors = [
      ...trackedNames,
      ...matrixCompetitors.slice(0, 3).map(c => c.name).filter(n => !trackedNames.includes(n)),
    ].slice(0, 5)

    if (allCompetitors.length === 0) {
      return NextResponse.json({ error: 'No competitors tracked. Add competitors via Atlas first.' }, { status: 400 })
    }

    // Fetch live intel on each competitor in parallel
    const liveData = await Promise.all(
      allCompetitors.map(async name => {
        const [jobs, news] = await Promise.all([
          tavilySearch(`${name} jobs hiring 2025 2026`),
          tavilySearch(`${name} startup news funding product launch 2025 2026`),
        ])
        return { name, jobs, news }
      })
    )

    const liveContext = liveData.map(d =>
      `${d.name}:\n  Jobs: ${d.jobs || 'No data'}\n  News: ${d.news || 'No data'}`
    ).join('\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Atlas, a competitive intelligence analyst. Analyze the latest intel on these competitors and produce a concise digest of meaningful signals.

Return ONLY valid JSON:
{
  "digest": [
    {
      "competitor": "competitor name",
      "signals": [
        {
          "type": "hiring | funding | product | pricing | partnership | market_move",
          "signal": "what you detected",
          "implication": "what this means for us",
          "urgency": "high | medium | low"
        }
      ],
      "overallMovement": "expanding | stable | contracting | pivoting | unknown",
      "actionable": "one specific thing we should do in response"
    }
  ],
  "summary": "2-sentence overall competitive landscape summary",
  "mostUrgent": "the single most urgent competitive threat or opportunity right now",
  "recommendedResponse": "what to prioritize in the next 2 weeks based on competitive intelligence"
}

Only include real signals from the data. If there's nothing new, say so honestly. Don't fabricate signals.`,
        },
        {
          role: 'user',
          content: `Competitive monitor for ${fp?.startup_name ?? 'this startup'} (${sp.industry ?? 'unknown industry'}).\n\nLatest intel:\n\n${liveContext}`,
        },
      ],
      { maxTokens: 900, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let digest: Record<string, unknown> = {}
    try { digest = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { digest = m ? JSON.parse(m[0]) : {} } catch { digest = {} } }

    // Update last_checked for tracked competitors
    if (trackedCompetitors && trackedCompetitors.length > 0) {
      await admin.from('tracked_competitors').update({ last_checked: new Date().toISOString() })
        .eq('user_id', user.id).then(() => {})
    }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'atlas',
      action_type: 'competitive_monitor_run',
      description: `Competitive monitor: ${allCompetitors.length} competitors scanned`,
      metadata:    { competitors: allCompetitors, mostUrgent: digest.mostUrgent },
    }).then(() => {})

    return NextResponse.json({ digest, competitors: allCompetitors })
  } catch (err) {
    console.error('Atlas monitor POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
