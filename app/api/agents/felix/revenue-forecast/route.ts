import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/revenue-forecast
// Body: { forecastMonths?: number, growthLevers?: string[] }
// Returns: { forecast: { summary, monthlyProjections[], annualSummary, growthDrivers[],
//   sensitivities[], risks[], milestones[], assumptions } }

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

    const body = await req.json().catch(() => ({})) as {
      forecastMonths?: number; growthLevers?: string[]
    }

    const admin = getAdmin()

    const [{ data: finArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('assessment_data').eq('user_id', user.id)
        .order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const fin = finArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const snapshot = fin?.snapshot as Record<string, string> | null

    const currentMRR = snapshot?.mrr ?? assessment?.mrr ?? 'unknown'
    const customers = snapshot?.customers ?? assessment?.customers ?? 'unknown'
    const avgDealSize = snapshot?.avgDealSize ?? 'unknown'
    const growthRate = snapshot?.growthRate ?? 'unknown'
    const forecastMonths = body.forecastMonths ?? 18
    const levers = body.growthLevers?.join(', ') ?? 'not specified'

    const prompt = `You are Felix, a financial advisor. Build an 18-month revenue forecast for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
CURRENT MRR: ${currentMRR}
CUSTOMERS: ${customers}
AVG DEAL SIZE: ${avgDealSize}
CURRENT GROWTH RATE: ${growthRate}
FORECAST PERIOD: ${forecastMonths} months
GROWTH LEVERS: ${levers}

Build a realistic revenue forecast with monthly projections. If metrics are unknown, use realistic ${stage} ${industry} benchmarks. Show optimistic and conservative scenarios.

Return JSON only (no markdown):
{
  "summary": "1-2 sentence forecast overview",
  "assumptions": {
    "startingMRR": "starting MRR or estimate",
    "monthlyGrowthRate": "assumed MoM growth rate",
    "churnRate": "assumed monthly churn",
    "avgDealSize": "assumed deal size",
    "salesCycleDays": "assumed sales cycle"
  },
  "monthlyProjections": [
    {
      "month": "Month 1",
      "newMRR": 5000,
      "churnedMRR": 500,
      "expansionMRR": 1000,
      "totalMRR": 25000,
      "customers": 50,
      "cumulativeARR": 300000
    }
  ],
  "annualSummary": {
    "year1ARR": 450000,
    "year1Growth": "2.5x",
    "year1CustomerCount": 90,
    "forecastEndMRR": 37500
  },
  "growthDrivers": [
    { "driver": "growth lever name", "impact": "high/medium/low", "implementation": "how to activate this lever", "timeline": "when it contributes" }
  ],
  "sensitivities": [
    { "variable": "variable to test (e.g. growth rate, churn, deal size)", "base": "base assumption", "downside": "bear case", "upside": "bull case", "mrrImpact": "revenue impact of each scenario" }
  ],
  "milestones": [
    { "milestone": "revenue milestone (e.g. $50K MRR, 100 customers, $1M ARR)", "estimatedMonth": "Month X", "significance": "why this matters" }
  ],
  "risks": [
    { "risk": "revenue risk", "probability": "high/medium/low", "mitigation": "how to reduce this risk" }
  ],
  "fundraisingSignal": "what this forecast suggests about fundraising timing and size"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let forecast: Record<string, unknown> = {}
    try { forecast = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate revenue forecast' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'revenue_forecast_built',
      action_data: { startupName, forecastMonths, year1ARR: (forecast.annualSummary as Record<string, unknown> | undefined)?.year1ARR },
    }).maybeSingle()

    return NextResponse.json({ forecast })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
