import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/win-loss
// No body — pulls competitive_matrix + battle_card for context
// Returns: { analysis: { winRate, winReasons[], lossReasons[], competitorBreakdown[],
//   patternsToExploit[], vulnerabilities[], repositioningOpportunities[], actionPlan[] } }

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

    const [{ data: matrixArt }, { data: battleArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'battle_card').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const description = profileData?.description as string ?? ''

    const matrix = matrixArt?.content as Record<string, unknown> | null
    const battle = battleArt?.content as Record<string, unknown> | null

    const competitors = (matrix?.competitors as { name?: string; weakness?: string }[] | undefined)
      ?.slice(0, 4).map(c => `${c.name ?? 'Competitor'} (weakness: ${c.weakness ?? 'unknown'})`).join('; ')
      ?? 'Not mapped yet'

    const yourStrengths = (battle?.strengths as string[] | undefined)?.slice(0, 3).join(', ') ?? 'Not defined'

    const prompt = `You are Atlas, a competitive intelligence expert. Produce a win/loss analysis for ${startupName}.

COMPANY: ${startupName} — ${description || industry}
KNOWN COMPETITORS: ${competitors}
YOUR STRENGTHS: ${yourStrengths}

Generate a strategic win/loss analysis that helps the sales and product team. Even without actual deal data, derive insights from positioning and market dynamics.

Return JSON only (no markdown):
{
  "winRateEstimate": "e.g. 35-45% estimated win rate against primary competitors",
  "winReasons": [
    { "reason": "why you typically win", "frequency": "high / medium / low", "competitorYouBeat": "which competitor" }
  ],
  "lossReasons": [
    { "reason": "why you typically lose", "frequency": "high / medium / low", "competitorYouLoseTo": "which competitor", "rootCause": "underlying cause" }
  ],
  "competitorBreakdown": [
    {
      "competitor": "name",
      "headToHeadVerdict": "win / lose / split",
      "theirBestScenario": "when they beat you",
      "yourBestScenario": "when you beat them",
      "dealBreaker": "their most common objection weapon"
    }
  ],
  "patternsToExploit": ["competitive pattern to take advantage of 1", "pattern 2", "pattern 3"],
  "vulnerabilities": ["your vulnerability that's being exploited 1", "vulnerability 2"],
  "repositioningOpportunities": ["opportunity to shift the conversation 1", "opportunity 2"],
  "messagingAdjustments": ["message change that would improve win rates 1", "change 2", "change 3"],
  "actionPlan": [
    { "action": "specific action", "owner": "sales / product / marketing", "impact": "high / medium / low", "timeline": "this week / this month / next quarter" }
  ],
  "keyInsight": "the single most important thing this analysis reveals"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate win/loss analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'win_loss_analyzed',
      action_data: { startupName, competitorCount: (analysis.competitorBreakdown as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
