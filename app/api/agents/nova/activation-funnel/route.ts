import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/activation-funnel
// No body — pulls pmf_survey + customer_insight + founder_profiles for context
// Returns: { funnel: { overview, stages[], dropOffPoints[], activationMoment, ahaMetric,
//   improvements[], experiments[], benchmarks[], quickWin } }

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
    const topPain = (insight?.topThemes as string[] | undefined)?.[0] ?? ''
    const personas = (insight?.personas as { name?: string }[] | undefined)?.slice(0, 2).map(p => p.name).join(', ') ?? ''

    const prompt = `You are Nova, a product-market fit expert. Build an activation funnel analysis for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PMF SCORE: ${pmfScore ?? 'unknown'}
TOP CUSTOMER PAIN: ${topPain || 'not specified'}
KEY PERSONAS: ${personas || 'not specified'}

Map the user activation funnel from signup to value realization. If data is unavailable, model a realistic funnel for ${stage} ${industry}. Focus on finding the activation moment and reducing time-to-value.

Return JSON only (no markdown):
{
  "overview": "1-sentence summary of funnel health",
  "activationRate": 42,
  "stages": [
    {
      "stage": "stage name (e.g. Signup, Onboarding, First Value, Activation, Habit)",
      "conversionRate": 72,
      "benchmark": 65,
      "dropOff": 28,
      "timeToComplete": "average time (e.g. 5 min, 2 days)",
      "topFriction": "main friction at this stage",
      "fix": "specific improvement"
    }
  ],
  "activationMoment": "the specific action that predicts long-term retention (aha moment)",
  "ahaMetric": "measurable signal of the aha moment (e.g. creates first project within 10 min)",
  "timeToAha": "average time users take to reach activation moment",
  "dropOffPoints": [
    { "point": "where users drop off most", "percentage": 35, "reason": "why they leave", "recovery": "re-engagement tactic" }
  ],
  "improvements": [
    { "improvement": "specific funnel improvement", "stage": "which stage it affects", "expectedLift": "estimated conversion improvement", "effort": "low/medium/high", "priority": "immediate/this sprint/next quarter" }
  ],
  "experiments": [
    { "experiment": "A/B test idea", "hypothesis": "what we expect", "metric": "success metric", "duration": "test length" }
  ],
  "benchmarks": [
    { "metric": "funnel metric (e.g. D1 retention, time-to-value, activation rate)", "yourEstimate": "estimated value", "good": "good benchmark", "great": "great benchmark" }
  ],
  "quickWin": "single fastest improvement to implement this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let funnel: Record<string, unknown> = {}
    try { funnel = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate activation funnel' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'activation_funnel_analyzed',
      action_data: { startupName, activationRate: funnel.activationRate },
    }).maybeSingle()

    return NextResponse.json({ funnel })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
