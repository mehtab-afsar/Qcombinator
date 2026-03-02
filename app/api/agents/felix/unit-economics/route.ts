import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/unit-economics
// No body — pulls financial_summary + qscore_history for metrics
// Returns: { economics: { verdict, ltvCacRatio, paybackMonths, grossMargin,
//   unitBreakdown, cohortAnalysis[], improvementLevers[], benchmarks, projections[] } }

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

    const [{ data: finArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('assessment_data').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const fin = finArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const snapshot = fin?.snapshot as Record<string, string> | null

    const mrr = snapshot?.mrr ?? assessment?.mrr ?? 'unknown'
    const ltv = snapshot?.ltv ?? assessment?.lifetimeValue ?? 'unknown'
    const cac = snapshot?.cac ?? assessment?.costPerAcquisition ?? 'unknown'
    const grossMargin = snapshot?.grossMargin ?? 'unknown'
    const burnRate = snapshot?.burn ?? assessment?.burnRate ?? 'unknown'
    const customers = snapshot?.customers ?? assessment?.customers ?? 'unknown'

    const prompt = `You are Felix, a financial advisor. Build a unit economics deep dive for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
MRR: ${mrr}
LTV: ${ltv}
CAC: ${cac}
GROSS MARGIN: ${grossMargin}
BURN RATE: ${burnRate}/month
CUSTOMERS: ${customers}

Perform a complete unit economics analysis with cohort modeling and improvement levers. Use realistic estimates where data is unknown.

Return JSON only (no markdown):
{
  "verdict": "1-sentence unit economics health assessment",
  "ltvCacRatio": "calculated LTV:CAC ratio",
  "ltvCacHealth": "poor (<1) / marginal (1-3) / good (3-5) / excellent (>5)",
  "paybackMonths": "CAC payback period in months",
  "grossMarginPct": "gross margin percentage",
  "unitBreakdown": {
    "revenuePerCustomer": "monthly revenue per customer",
    "costToServe": "monthly cost per customer",
    "contributionMargin": "revenue minus cost to serve",
    "timeToBreakEven": "months to break even per customer"
  },
  "cohortAnalysis": [
    { "cohort": "Month 1", "retention": "retention %", "cumulativeRevenue": "revenue by this point", "ltv": "lifetime value at this stage" },
    { "cohort": "Month 3", "retention": "retention %", "cumulativeRevenue": "revenue by this point", "ltv": "lifetime value at this stage" },
    { "cohort": "Month 6", "retention": "retention %", "cumulativeRevenue": "revenue by this point", "ltv": "lifetime value at this stage" },
    { "cohort": "Month 12", "retention": "retention %", "cumulativeRevenue": "revenue by this point", "ltv": "lifetime value at this stage" }
  ],
  "improvementLevers": [
    { "lever": "specific metric to improve", "currentState": "where it is now", "target": "achievable target", "impact": "what a 10% improvement does to unit economics", "howTo": "specific action to take" }
  ],
  "benchmarks": {
    "ltvCacBenchmark": "benchmark LTV:CAC for ${stage} ${industry}",
    "paybackBenchmark": "benchmark payback months",
    "marginBenchmark": "benchmark gross margin",
    "yourRating": "below benchmark / at benchmark / above benchmark"
  },
  "projections": [
    { "scenario": "conservative", "ltvCacIn12Months": "projected ratio", "paybackIn12Months": "projected payback", "keyAssumption": "what drives this scenario" },
    { "scenario": "base", "ltvCacIn12Months": "projected ratio", "paybackIn12Months": "projected payback", "keyAssumption": "what drives this scenario" },
    { "scenario": "optimistic", "ltvCacIn12Months": "projected ratio", "paybackIn12Months": "projected payback", "keyAssumption": "what drives this scenario" }
  ],
  "priorityAction": "single highest-leverage action to improve unit economics this quarter"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let economics: Record<string, unknown> = {}
    try { economics = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate unit economics analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'unit_economics_analyzed',
      action_data: { startupName, ltvCacRatio: economics.ltvCacRatio },
    }).maybeSingle()

    return NextResponse.json({ economics })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
