import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/scenario-planning
// No body — pulls financial_summary + qscore_history for financial context
// Returns: { scenarios: { verdict, scenarios[], keyVariables[], triggerPoints[],
//   contingencyPlans[], monitoringDashboard[], decisionTree, priorityAction } }

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
    const burn = snapshot?.burn ?? assessment?.burnRate ?? 'unknown'
    const runway = snapshot?.runway ?? assessment?.runway ?? 'unknown'
    const mrrGrowth = snapshot?.mrrGrowth ?? assessment?.mrrGrowth ?? 'unknown'

    const prompt = `You are Felix, a financial advisor. Build a 3-scenario financial plan for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
CURRENT MRR: ${mrr}
BURN RATE: ${burn}/month
RUNWAY: ${runway}
MRR GROWTH RATE: ${mrrGrowth}

Model 3 distinct scenarios for the next 18 months. Use realistic financial assumptions for a ${stage} ${industry} company.

Return JSON only (no markdown):
{
  "verdict": "1-sentence current financial trajectory assessment",
  "scenarios": [
    {
      "name": "Bear / Base / Bull",
      "probability": "estimated probability %",
      "trigger": "what causes this scenario",
      "mrrIn6Months": "projected MRR in 6 months",
      "mrrIn12Months": "projected MRR in 12 months",
      "mrrIn18Months": "projected MRR in 18 months",
      "burnIn12Months": "burn rate in 12 months",
      "runwayExtension": "how much runway extends",
      "headcountNeeded": "team size at this scenario",
      "fundingImplication": "what funding is needed / not needed",
      "keyMilestone": "the critical milestone that defines this scenario"
    }
  ],
  "keyVariables": [
    { "variable": "input variable", "bearAssumption": "bear case value", "baseAssumption": "base case value", "bullAssumption": "bull case value", "sensitivity": "impact on MRR per 10% change" }
  ],
  "triggerPoints": [
    { "trigger": "observable event", "scenario": "which scenario it signals", "action": "what to do when triggered", "leadTime": "how much time you have to react" }
  ],
  "contingencyPlans": [
    { "contingency": "risk event", "probability": "likelihood %", "response": "what to do", "preparation": "what to do now to be ready" }
  ],
  "monitoringDashboard": [
    { "metric": "metric to track weekly", "target": "desired value", "alert": "when to escalate" }
  ],
  "decisionTree": "the key decision you face in the next 90 days and what triggers each branch",
  "priorityAction": "single most important financial action to take this week regardless of scenario"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let scenarios: Record<string, unknown> = {}
    try { scenarios = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate scenario planning' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'scenario_planned',
      action_data: { startupName },
    }).maybeSingle()

    return NextResponse.json({ scenarios })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
