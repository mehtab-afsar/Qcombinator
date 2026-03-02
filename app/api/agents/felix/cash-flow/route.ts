import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/cash-flow
// No body — pulls financial_summary artifact for actuals
// Returns: { forecast: { months[], scenarios: { base, bull, bear }, runwayByScenario,
//   keyAssumptions[], risks[], recommendations[] } }

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

    const [{ data: finArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'

    const fin = finArt?.content as Record<string, unknown> | null
    const mrr = fin?.mrr as string ?? fin?.currentMRR as string ?? 'unknown'
    const burn = fin?.monthlyBurn as string ?? fin?.burn as string ?? 'unknown'
    const runway = fin?.runwayMonths as string ?? fin?.runway as string ?? 'unknown'
    const growth = fin?.mrrGrowth as string ?? fin?.growthRate as string ?? 'unknown'
    const cashBalance = fin?.cashBalance as string ?? fin?.cash as string ?? 'unknown'

    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    })

    const prompt = `You are Felix, a CFO advisor. Build a 12-month cash flow forecast for ${startupName}.

COMPANY: ${startupName} (${stage})
CURRENT MRR: ${mrr}
MONTHLY BURN: ${burn}
RUNWAY: ${runway} months
MOM GROWTH RATE: ${growth}
CASH BALANCE: ${cashBalance}
MONTHS TO FORECAST: ${months.join(', ')}

Build a realistic 12-month forecast with 3 scenarios. Use actual numbers where provided, estimate where not.

Return JSON only (no markdown):
{
  "currentMetrics": {
    "mrr": "${mrr}",
    "monthlyBurn": "${burn}",
    "cashBalance": "${cashBalance}",
    "runwayMonths": "${runway}"
  },
  "scenarios": {
    "base": {
      "name": "Base Case",
      "growthAssumption": "e.g. 10% MoM revenue growth",
      "burnAssumption": "e.g. burn stays flat at $X",
      "months": [
        { "month": "Jun '25", "revenue": 15000, "burn": 45000, "netCashFlow": -30000, "cashBalance": 270000, "runway": 9 }
      ],
      "endingCash": 120000,
      "endingRunway": 4,
      "raiseRequired": true,
      "raiseRequiredBy": "Q3 2025"
    },
    "bull": {
      "name": "Bull Case",
      "growthAssumption": "20% MoM revenue growth",
      "burnAssumption": "burn increases 10% for growth investment",
      "months": [],
      "endingCash": 250000,
      "endingRunway": 8,
      "raiseRequired": false,
      "raiseRequiredBy": null
    },
    "bear": {
      "name": "Bear Case",
      "growthAssumption": "5% MoM, some churn",
      "burnAssumption": "burn stays flat",
      "months": [],
      "endingCash": 40000,
      "endingRunway": 1,
      "raiseRequired": true,
      "raiseRequiredBy": "Q2 2025"
    }
  },
  "keyAssumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "topRisks": [
    { "risk": "risk description", "impact": "high/medium/low", "mitigation": "what to do about it" }
  ],
  "recommendations": [
    { "action": "specific recommendation", "urgency": "immediate/this quarter/next quarter", "rationale": "why" }
  ],
  "fundraisingImplication": "1-2 sentences on when/if to raise based on these scenarios"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let forecast: Record<string, unknown> = {}
    try { forecast = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate cash flow forecast' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'cash_flow_forecast_generated',
      action_data: { startupName, stage },
    }).maybeSingle()

    return NextResponse.json({ forecast })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
