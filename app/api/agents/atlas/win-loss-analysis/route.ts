import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/win-loss-analysis
// No body — pulls competitive_matrix + sales_script + gtm_playbook for context
// Returns: { analysis: { verdict, winThemes[], lossThemes[], competitorWinRate[],
//   objectionPatterns[], dealAccelerators[], icp refinement, coachingInsights[], priorityFix } }

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

    const [{ data: compArt }, { data: salesArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const comp = compArt?.content as Record<string, unknown> | null
    const sales = salesArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const competitors = (comp?.competitors as { name?: string }[] | undefined)?.slice(0, 4).map(c => c.name).join(', ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'not specified'
    const topObjection = (sales?.objections as { objection?: string }[] | undefined)?.[0]?.objection ?? ''

    const prompt = `You are Atlas, a competitive intelligence analyst. Build a win/loss analysis for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
KNOWN COMPETITORS: ${competitors || 'none on file'}
ICP: ${icp}
TOP KNOWN OBJECTION: ${topObjection || 'not specified'}

Build a diagnostic win/loss analysis. Identify patterns, competitor threats, and what to fix in the sales motion.

Return JSON only (no markdown):
{
  "verdict": "1-sentence win/loss health summary",
  "estimatedWinRate": "typical win rate for a ${stage} ${industry} startup",
  "winThemes": [
    { "theme": "why deals are won", "frequency": "how often this drives wins", "reinforce": "how to amplify this" }
  ],
  "lossThemes": [
    { "theme": "why deals are lost", "frequency": "how often this causes loss", "fix": "what to change", "urgency": "high/medium/low" }
  ],
  "competitorWinRate": [
    { "competitor": "competitor name or type", "winRateAgainst": "estimated win rate when competing", "theirAdvantage": "why they win", "yourCounter": "how to beat them" }
  ],
  "objectionPatterns": [
    { "objection": "common objection pattern", "stage": "where in funnel it appears", "response": "winning response", "closingMove": "how to convert after objection" }
  ],
  "dealAccelerators": [
    { "tactic": "what accelerates deal close", "impact": "high/medium/low", "howToUse": "implementation detail" }
  ],
  "icpRefinement": {
    "highestWinRateSegment": "which ICP segment wins most",
    "lowestWinRateSegment": "which to deprioritize",
    "recommendation": "ICP sharpening suggestion"
  },
  "coachingInsights": [
    { "insight": "sales coaching observation", "drill": "practice exercise to improve", "metric": "how to measure improvement" }
  ],
  "priorityFix": "the single most impactful change to improve win rate in the next 30 days"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate win/loss analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'win_loss_analyzed',
      action_data: { startupName, estimatedWinRate: analysis.estimatedWinRate },
    }).maybeSingle()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
