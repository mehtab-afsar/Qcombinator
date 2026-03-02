import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/trend-radar
// No body — pulls competitive_matrix + founder_profiles for context
// Returns: { radar: { scanDate, tailwinds[], headwinds[], emergingThreats[],
//   opportunityWindows[], trendSignals[], strategicImplications[], watchList[], verdict } }

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

    const [{ data: matrixArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const matrix = matrixArt?.content as Record<string, unknown> | null
    const competitors = (matrix?.competitors as { name?: string }[] | undefined)
      ?.slice(0, 4).map(c => c.name ?? '').filter(Boolean).join(', ') ?? ''
    const ourPosition = (matrix?.ourPosition as { primaryAdvantage?: string } | undefined)?.primaryAdvantage ?? ''

    const prompt = `You are Atlas, a competitive intelligence expert. Run a market trend radar for ${startupName} as of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.

COMPANY: ${startupName} — ${stage} ${industry}
KNOWN COMPETITORS: ${competitors || 'not specified'}
OUR ADVANTAGE: ${ourPosition || 'not specified'}

Identify market-level trends, threats, and opportunities relevant to this company's space. Think like a market analyst who reads TechCrunch, CB Insights, and Gartner.

Return JSON only (no markdown):
{
  "scanDate": "${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}",
  "verdict": "1-sentence market temperature for this space right now",
  "tailwinds": [
    {
      "trend": "trend name",
      "description": "what is happening and why it helps you",
      "timeHorizon": "now / 6 months / 1 year / 2+ years",
      "magnitude": "high/medium/low",
      "howToRide": "how to capitalize on this tailwind"
    }
  ],
  "headwinds": [
    {
      "trend": "headwind name",
      "description": "what is happening and why it hurts",
      "timeHorizon": "now / 6 months / 1 year",
      "severity": "high/medium/low",
      "mitigation": "how to minimize exposure"
    }
  ],
  "emergingThreats": [
    {
      "threat": "threat name",
      "source": "who/what is the threat (competitor move, regulation, tech shift)",
      "probability": "high/medium/low",
      "impactIfMaterializes": "what happens to your business",
      "earlyWarningSign": "signal to watch for"
    }
  ],
  "opportunityWindows": [
    {
      "opportunity": "opportunity name",
      "description": "why this window is open now",
      "timeLimit": "how long this window stays open",
      "requiredAction": "what you need to do to capture it",
      "winningCriteria": "how you'll know you've captured it"
    }
  ],
  "trendSignals": [
    { "signal": "observable signal", "what": "what it tells you about the market", "source": "where to track this" }
  ],
  "strategicImplications": [
    "strategic implication for your roadmap/positioning 1",
    "implication 2",
    "implication 3"
  ],
  "watchList": [
    { "item": "company/technology/regulation to monitor", "why": "why it matters to you", "checkEvery": "weekly/monthly/quarterly" }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let radar: Record<string, unknown> = {}
    try { radar = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate trend radar' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'trend_radar_run',
      action_data: { startupName, industry },
    }).maybeSingle()

    return NextResponse.json({ radar })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
