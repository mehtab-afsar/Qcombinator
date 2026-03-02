import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/model
// No body — pulls latest financial_summary artifact for seed data
// Returns: { scenarios: { name, months: { month, revenue, expenses, netBurn, runway, customers }[] }[],
//   assumptions: string[], keyMilestones: { month, milestone, revenue }[], recommendation: string,
//   breakEvenMonth: number | null, csvData: string }

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

    const [{ data: financialArtifact }, { data: qscoreRow }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('qscore_history').select('assessment_data').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const fin = financialArtifact?.content as Record<string, unknown> | null
    const assessData = qscoreRow?.assessment_data as Record<string, unknown> | null

    // Extract seed metrics from available data
    const snapshot = fin?.snapshot as Record<string, string> | undefined
    const mrr = parseFloat((snapshot?.mrr ?? snapshot?.MRR ?? assessData?.mrr ?? '0').toString().replace(/[^0-9.]/g, '')) || 0
    const burn = parseFloat((snapshot?.burnRate ?? snapshot?.burn ?? assessData?.monthlyBurnRate ?? '0').toString().replace(/[^0-9.]/g, '')) || 0
    const runway = parseFloat((snapshot?.runway ?? assessData?.runwayMonths ?? '12').toString().replace(/[^0-9.]/g, '')) || 12
    const customers = parseFloat((snapshot?.customers ?? assessData?.currentCustomers ?? '0').toString().replace(/[^0-9.]/g, '')) || 0
    const cashOnHand = burn * runway

    const prompt = `You are Felix, a financial modeling expert. Build a 24-month financial model for ${startupName}.

CURRENT METRICS:
- MRR: $${mrr.toLocaleString()}
- Monthly burn: $${burn.toLocaleString()}
- Cash on hand: ~$${Math.round(cashOnHand).toLocaleString()} (${runway} months runway)
- Current customers: ${customers}

Build 3 scenarios: Conservative (base -30%), Base (realistic growth), Optimistic (base +40%).

For each scenario, project 24 months:
- Revenue: start from MRR, apply monthly growth rate (conservative 5%, base 10%, optimistic 18%)
- Expenses: start from burn, increase by 3-5% monthly as company grows
- Net burn = expenses - revenue (positive = profitable)
- Runway = remaining cash / net burn

Return JSON only (no markdown):
{
  "assumptions": ["assumption 1", "assumption 2", "assumption 3", "assumption 4"],
  "scenarios": [
    {
      "name": "Conservative",
      "monthlyGrowthRate": 5,
      "months": [
        { "month": 1, "revenue": 0, "expenses": 0, "netBurn": 0, "cumulativeCash": 0, "customers": 0 }
      ]
    }
  ],
  "keyMilestones": [
    { "month": 6, "milestone": "Break-even at current burn", "revenueTarget": 0 }
  ],
  "breakEvenMonth": null,
  "recommendation": "2-3 sentence strategic recommendation based on the model"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1500 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let model: Record<string, unknown> = {}
    try { model = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate financial model' }, { status: 500 })
    }

    // Build CSV export from base scenario
    const scenarios = model.scenarios as { name: string; months: { month: number; revenue: number; expenses: number; netBurn: number; cumulativeCash: number; customers: number }[] }[] | undefined
    const baseScenario = scenarios?.find(s => s.name === 'Base') ?? scenarios?.[0]
    let csvData = 'Month,Revenue ($),Expenses ($),Net Burn ($),Cumulative Cash ($),Customers\n'
    if (baseScenario) {
      baseScenario.months.forEach(m => {
        csvData += `${m.month},${m.revenue},${m.expenses},${m.netBurn},${m.cumulativeCash},${m.customers}\n`
      })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'financial_model_generated',
      action_data: { startingMRR: mrr, startingBurn: burn, runway, scenarioCount: (scenarios ?? []).length },
    }).maybeSingle()

    return NextResponse.json({ ...model, csvData, startingMetrics: { mrr, burn, runway, customers, cashOnHand: Math.round(cashOnHand) } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
