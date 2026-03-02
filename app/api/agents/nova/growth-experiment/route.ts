import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/growth-experiment
// Body: { focus?: string } — optional focus area (e.g. "acquisition", "activation", "retention")
// Pulls pmf_survey + customer_insight + founder_profiles for context
// Returns: { experiments: { overview, experiments[], backlog[], priorityMatrix,
//   runningPlaybook, successCriteria, pitfalls[] } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { focus?: string }

    const admin = getAdmin()

    const [{ data: pmfArt }, { data: insightArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'customer_insight').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const pmf = pmfArt?.content as Record<string, unknown> | null
    const insight = insightArt?.content as Record<string, unknown> | null

    const pmfScore = (pmf?.pmfSignals as { score?: number } | undefined)?.score ?? null
    const topPain = (insight?.topThemes as string[] | undefined)?.[0] ?? ''
    const focus = body.focus ?? 'acquisition and activation'

    const prompt = `You are Nova, a product-market fit expert. Design a growth experiment program for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PMF SCORE: ${pmfScore ?? 'unknown'}
TOP CUSTOMER PAIN: ${topPain || 'not specified'}
EXPERIMENT FOCUS: ${focus}

Design a rigorous growth experiment program. Each experiment should be specific, measurable, and completable in 1-2 weeks. Focus on the highest-leverage bets for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence summary of the growth experiment philosophy",
  "experiments": [
    {
      "name": "experiment name",
      "hypothesis": "if we do X, then Y will happen because Z",
      "category": "acquisition/activation/retention/revenue/referral",
      "priority": "P0/P1/P2",
      "effort": "low/medium/high",
      "expectedImpact": "high/medium/low",
      "duration": "1 week / 2 weeks",
      "steps": ["step 1", "step 2", "step 3"],
      "primaryMetric": "the one metric that proves success",
      "minimumSuccessThreshold": "what result constitutes a win",
      "failureSignal": "what result means it failed"
    }
  ],
  "backlog": [
    { "name": "experiment idea", "category": "AARRR category", "rationale": "why this might work" }
  ],
  "priorityMatrix": {
    "runNow": ["experiment names to start this week"],
    "runNext": ["experiment names for next sprint"],
    "parkForLater": ["experiment names to revisit later"]
  },
  "runningPlaybook": {
    "weeklyRhythm": "describe the weekly experiment cadence",
    "decisionCriteria": "how to decide when to kill vs scale an experiment",
    "documentationProcess": "how to capture learnings"
  },
  "successCriteria": "what a successful experiment program looks like in 90 days",
  "pitfalls": ["common experimentation mistake 1", "pitfall 2", "pitfall 3"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let experiments: Record<string, unknown> = {}
    try { experiments = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate growth experiments' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'growth_experiments_designed',
      action_data: { startupName, focus, experimentCount: (experiments.experiments as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ experiments })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
