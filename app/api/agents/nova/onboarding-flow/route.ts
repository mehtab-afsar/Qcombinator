import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/onboarding-flow
// No body — pulls pmf_survey + customer_insight + user_personas for context
// Returns: { flow: { overview, ahaGoal, steps[], emailSequence[], inAppMessages[],
//   milestones[], successMetrics[], commonFailPoints[], improvements[] } }

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

    const [{ data: pmfArt }, { data: insightArt }, { data: personaArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'customer_insight').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'user_personas').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const pmf = pmfArt?.content as Record<string, unknown> | null
    const insight = insightArt?.content as Record<string, unknown> | null
    const personas = personaArt?.content as Record<string, unknown> | null

    const pmfScore = (pmf?.pmfSignals as { score?: number } | undefined)?.score ?? null
    const topPain = (insight?.topThemes as string[] | undefined)?.[0] ?? ''
    const primaryPersona = (personas?.personas as { name?: string; goal?: string }[] | undefined)?.[0]

    const prompt = `You are Nova, a product-market fit expert. Design a complete onboarding flow for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PMF SCORE: ${pmfScore ?? 'unknown'}
TOP CUSTOMER PAIN: ${topPain || 'not specified'}
PRIMARY PERSONA: ${primaryPersona ? `${primaryPersona.name} — goal: ${primaryPersona.goal}` : 'not specified'}

Design an onboarding flow that gets users to their first "aha moment" as fast as possible. Include both product steps and communication touchpoints.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence onboarding philosophy",
  "ahaGoal": "the single activation milestone the entire onboarding is designed to reach",
  "targetTimeToAha": "goal time to reach the aha moment (e.g. < 10 minutes / Day 1)",
  "steps": [
    {
      "step": "step number and name",
      "type": "signup / setup / action / value / habit",
      "purpose": "what this step achieves",
      "friction": "how much friction this step adds",
      "copy": "UI copy or CTA for this step",
      "skipAllowed": true,
      "successSignal": "how you know the user completed this successfully"
    }
  ],
  "emailSequence": [
    {
      "email": "email number and name (e.g. Email 1: Welcome)",
      "sendTiming": "when to send (e.g. immediately / Day 2 / Day 7)",
      "trigger": "behavioral trigger or time-based",
      "subject": "email subject line",
      "preview": "email preview text",
      "bodyOutline": "2-3 sentence email body outline",
      "cta": "call-to-action"
    }
  ],
  "inAppMessages": [
    { "trigger": "user behavior that triggers the message", "message": "short in-app message copy", "cta": "button text" }
  ],
  "milestones": [
    { "milestone": "activation milestone", "timing": "Day X", "metric": "measurable signal" }
  ],
  "commonFailPoints": [
    { "failPoint": "where users typically drop off", "percentage": 40, "cause": "why they leave", "fix": "specific improvement" }
  ],
  "successMetrics": [
    { "metric": "onboarding KPI", "currentBenchmark": "industry benchmark", "target": "what to aim for" }
  ],
  "improvements": [
    { "improvement": "specific onboarding improvement", "impact": "high/medium/low", "effort": "low/medium/high" }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let flow: Record<string, unknown> = {}
    try { flow = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate onboarding flow' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'onboarding_flow_designed',
      action_data: { startupName, stepCount: (flow.steps as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ flow })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
