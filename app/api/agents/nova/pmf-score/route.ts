import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/pmf-score
// No body — pulls survey results + churn data + feature requests + cohort data
// Returns: { pmfScore: number, grade: string, dimensions: { name, score, weight, status, insight }[],
//   verdict: string, topSignals: string[], risks: string[], nextStep: string, trend: 'improving'|'stalling'|'declining' }

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

    // Pull all relevant PMF data in parallel
    const [
      { data: surveyArtifact },
      { data: churnActivity },
      { data: featureActivity },
      { data: cohortActivity },
      { data: fp },
    ] = await Promise.all([
      // Latest PMF survey artifact with results
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .in('artifact_type', ['pmf_survey', 'survey_results']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Churn analysis activity
      admin.from('agent_activity').select('action_data').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('action_type', 'churn_analyzed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Feature aggregation activity
      admin.from('agent_activity').select('action_data').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('action_type', 'features_aggregated').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Cohort analysis activity
      admin.from('agent_activity').select('action_data').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('action_type', 'cohort_analyzed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const surveyData = surveyArtifact?.content as Record<string, unknown> | null
    const churnData  = churnActivity?.action_data as Record<string, unknown> | null
    const featureData = featureActivity?.action_data as Record<string, unknown> | null
    const cohortData  = cohortActivity?.action_data as Record<string, unknown> | null

    // Build context summary
    const surveyContext = surveyData
      ? `Survey NPS: ${surveyData.npsScore ?? surveyData.nps ?? 'N/A'} | Respondents: ${surveyData.respondentCount ?? 'N/A'} |
Very disappointed if gone: ${surveyData.veryDisappointed ?? 'N/A'}% | Top use case: ${surveyData.primaryUseCase ?? 'N/A'}`
      : 'No survey data collected yet'

    const churnContext = churnData
      ? `Churn risk score: ${churnData.churnRiskScore ?? 'N/A'} | At-risk segments: ${JSON.stringify(churnData.atRiskSegments ?? []).slice(0, 100)}`
      : 'No churn data available'

    const featureContext = featureData
      ? `Top requested features: ${JSON.stringify((featureData.topThemes as { theme: string; count: number }[] | undefined)?.slice(0, 3).map(t => t.theme) ?? [])}`
      : 'No feature request data'

    const cohortContext = cohortData
      ? `Cohort count: ${cohortData.cohortCount ?? 'N/A'} | Best cohort NPS: ${cohortData.bestCohortNPS ?? 'N/A'}`
      : 'No cohort data'

    const prompt = `You are a PMF (Product-Market Fit) analyst. Score ${startupName} on product-market fit across 5 dimensions.

DATA AVAILABLE:
${surveyContext}
${churnContext}
${featureContext}
${cohortContext}

Score each dimension 0-100. If data is missing for a dimension, score it 25 (unknown baseline).

DIMENSIONS (with weights):
1. Retention signal (30%) — do users keep coming back? Infer from churn risk, cohort data
2. NPS / disappointment test (25%) — NPS score and "very disappointed" % (>40% = strong PMF)
3. Organic growth (20%) — word-of-mouth, referrals, organic demand signals
4. Engagement depth (15%) — are users getting repeated value, core use cases strong
5. Expansion revenue (10%) — are existing users spending more over time

Return JSON only (no markdown):
{
  "pmfScore": 0-100,
  "grade": "Strong PMF | Weak Signal | Pre-PMF | No Signal",
  "dimensions": [
    { "name": "Retention Signal", "weight": 30, "score": 0-100, "status": "strong|moderate|weak|unknown", "insight": "one sentence" }
  ],
  "verdict": "2-sentence PMF assessment",
  "topSignals": ["positive signal 1", "positive signal 2"],
  "risks": ["risk 1", "risk 2"],
  "nextStep": "single most important action to improve PMF score",
  "trend": "improving|stalling|declining|unknown"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to parse PMF score' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'pmf_scored',
      action_data: { pmfScore: result.pmfScore, grade: result.grade, trend: result.trend },
    }).maybeSingle()

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
