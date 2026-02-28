import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/scenario
// Models financial scenarios: "What if I hire 2 engineers?" or "What if churn doubles?"
// Body: { scenario: string, financialSnapshot?: string, additionalAssumptions?: string }
// Returns: { result: { scenarioSummary, assumptions[], impacts[{ metric, current, projected, change, direction }], runwayImpact, recommendation, alternativeScenario } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { scenario, financialSnapshot, additionalAssumptions } = body as {
      scenario: string
      financialSnapshot?: string
      additionalAssumptions?: string
    }

    if (!scenario?.trim()) {
      return NextResponse.json({ error: 'Scenario description is required' }, { status: 400 })
    }

    const admin = getAdmin()

    const [
      { data: fp },
      { data: felixArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fin = (felixArtifact?.content ?? {}) as Record<string, unknown>
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    // Client can pass a pre-formatted snapshot; fallback to artifact data
    const financialContext = financialSnapshot?.trim() || [
      fin.mrr ? `MRR: $${fin.mrr}` : 'MRR: unknown',
      fin.monthlyBurn ? `Monthly burn: $${fin.monthlyBurn}` : 'Burn: unknown',
      fin.runway ? `Runway: ${fin.runway}` : 'Runway: unknown',
      fin.customers ? `Customers: ${fin.customers}` : '',
      fin.churnRate ? `Churn: ${fin.churnRate}%/mo` : '',
      fin.grossMargin ? `Gross margin: ${fin.grossMargin}%` : '',
      sp.fundingRaised ? `Cash raised: $${sp.fundingRaised}` : '',
      additionalAssumptions ? `Additional context: ${additionalAssumptions}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Felix, a startup CFO. Model the financial impact of a scenario. Use real numbers. Show your math.

Return ONLY valid JSON:
{
  "scenarioSummary": "plain-English summary of what this scenario does financially in 2-3 sentences",
  "assumptions": ["key assumption 1", "key assumption 2"],
  "impacts": [
    {
      "metric": "metric name (e.g. Monthly Burn)",
      "current": "current value (e.g. $45,000)",
      "projected": "projected value (e.g. $70,000)",
      "change": "delta (e.g. +$25,000/mo)",
      "direction": "positive | negative | neutral"
    }
  ],
  "runwayImpact": "e.g. Runway drops from 14 months to 9 months",
  "recommendation": "yes or no — and exactly why in 2 sentences",
  "alternativeScenario": "a lower-cost or lower-risk alternative that achieves a similar goal"
}

Produce 4-6 impact rows covering: burn, runway, break-even, cash position, MRR (if revenue scenario). Use actual numbers from context.`,
        },
        {
          role: 'user',
          content: `Model this scenario for ${fp?.startup_name ?? 'this startup'}:\n\nScenario: ${scenario}\n\nFinancials:\n${financialContext}`,
        },
      ],
      { maxTokens: 800, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'felix',
      action_type: 'scenario_modeled',
      description: `Scenario modeled: "${scenario.slice(0, 80)}"`,
      metadata:    { scenario: scenario.slice(0, 200), runwayImpact: result.runwayImpact },
    }).then(() => {})

    return NextResponse.json({ result, scenario })
  } catch (err) {
    console.error('Felix scenario POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
