import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/retention-analysis
// No body — pulls pmf_survey + customer_insight + founder_profiles for context
// Returns: { retention: { overallRetentionScore, cohortAnalysis[], retentionDrivers[],
//   churnReasons[], actionPlan[], benchmarks[], earlyWarningSignals[], verdict } }

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
    const segments = (pmf?.segmentAnalysis as { segment?: string; retentionSignal?: string }[] | undefined)
      ?.slice(0, 3).map(s => `${s.segment}: ${s.retentionSignal ?? 'unknown'}`).join('; ') ?? ''
    const topPain = (insight?.topThemes as string[] | undefined)?.[0] ?? ''

    const prompt = `You are Nova, a product-market fit expert. Run a retention analysis for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PMF SCORE: ${pmfScore ?? 'unknown'}
SEGMENTS: ${segments || 'none available'}
TOP CUSTOMER PAIN: ${topPain || 'not specified'}

Model a realistic retention analysis for a ${stage} ${industry} startup. If data is unavailable, use industry benchmarks. Focus on actionable insights.

Return JSON only (no markdown):
{
  "overallRetentionScore": 65,
  "verdict": "1-sentence retention health assessment",
  "cohortAnalysis": [
    {
      "cohort": "cohort label (e.g. Month 1, Week 2)",
      "retentionRate": 72,
      "benchmark": 68,
      "trend": "improving/stable/declining",
      "keyDriver": "primary driver of this cohort's retention"
    }
  ],
  "retentionDrivers": [
    { "driver": "what drives retention", "strength": "strong/moderate/weak", "evidence": "why we believe this" }
  ],
  "churnReasons": [
    { "reason": "churn reason", "frequency": "high/medium/low", "segment": "which users churn for this reason", "fix": "how to address it" }
  ],
  "actionPlan": [
    { "action": "specific retention action", "timeline": "this week / this month / this quarter", "impact": "high/medium/low", "effort": "low/medium/high", "metric": "how to measure success" }
  ],
  "earlyWarningSignals": [
    "behavioral signal that predicts churn 1",
    "signal 2",
    "signal 3"
  ],
  "retentionExperiments": [
    { "experiment": "experiment name", "hypothesis": "why this should improve retention", "metric": "what to measure", "duration": "test duration" }
  ],
  "benchmarks": [
    { "metric": "D1/D7/D30 retention or NRR", "yourEstimate": "estimated value", "goodBenchmark": "good benchmark", "greatBenchmark": "great benchmark" }
  ],
  "quickWin": "single fastest thing to improve retention this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let retention: Record<string, unknown> = {}
    try { retention = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate retention analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'retention_analyzed',
      action_data: { startupName, overallRetentionScore: retention.overallRetentionScore },
    }).maybeSingle()

    return NextResponse.json({ retention })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
