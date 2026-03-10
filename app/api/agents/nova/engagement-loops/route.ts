import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/engagement-loops
// No body — pulls pmf_survey + customer_insight + onboarding_flow for context
// Returns: { loops: { verdict, coreLoop, loops[], habitFormation, triggers[],
//   variableRewards[], socialHooks[], metrics[], experiments[], priorityBuild } }

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

    const [{ data: pmfArt }, { data: custArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'customer_insight').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('assessment_data').eq('user_id', user.id)
        .order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const pmf = pmfArt?.content as Record<string, unknown> | null
    const cust = custArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null

    const coreJob = (cust?.jobsToBeDone as string[] | undefined)?.[0] ?? ''
    const topPain = (cust?.topPains as string[] | undefined)?.[0] ?? ''
    const retentionRate = (assessment?.retentionRate as string | undefined) ?? 'unknown'
    const ahaScore = (pmf?.ahaScore as number | undefined) ?? 0

    const prompt = `You are Nova, a product-market fit expert. Design engagement loops for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
CORE JOB TO BE DONE: ${coreJob || 'not specified'}
TOP PAIN: ${topPain || 'not specified'}
RETENTION RATE: ${retentionRate}
AHA SCORE: ${ahaScore}/100

Design product engagement loops using habit formation principles (Hooked model + product-led growth).

Return JSON only (no markdown):
{
  "verdict": "1-sentence engagement health assessment",
  "coreLoop": {
    "trigger": "what prompts users to return",
    "action": "the core action users take",
    "variableReward": "the unpredictable value they get",
    "investment": "what users put in that keeps them coming back",
    "loopDuration": "how long one loop takes"
  },
  "loops": [
    {
      "loopName": "loop name",
      "type": "core / viral / social / content / data",
      "description": "how this loop works",
      "entryPoint": "what triggers it",
      "exitPoint": "what completes the loop",
      "k_factor": "virality coefficient if applicable",
      "buildDifficulty": "low/medium/high",
      "impact": "retention / acquisition / monetization"
    }
  ],
  "habitFormation": {
    "triggerType": "external / internal / social",
    "frequencyTarget": "desired usage frequency",
    "habitCue": "the cue that builds the habit",
    "routineIntegration": "how to integrate into existing routines"
  },
  "triggers": [
    { "trigger": "specific trigger", "channel": "push / email / in-app / social", "timing": "when to fire", "copy": "example notification or message" }
  ],
  "variableRewards": [
    { "rewardType": "type of variable reward", "implementation": "how to implement", "exampleProducts": "who does this well" }
  ],
  "socialHooks": [
    { "hook": "social engagement mechanic", "howToBuild": "implementation approach", "viralPotential": "low/medium/high" }
  ],
  "metrics": [
    { "metric": "engagement metric", "target": "benchmark for ${stage} ${industry}", "frequency": "how often to measure" }
  ],
  "experiments": [
    { "experiment": "engagement experiment to run", "hypothesis": "expected outcome", "duration": "how long to run", "successCriteria": "how to measure" }
  ],
  "priorityBuild": "the single engagement feature to build next for maximum retention impact"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let loops: Record<string, unknown> = {}
    try { loops = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate engagement loops' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'engagement_loops_designed',
      action_data: { startupName, loopCount: (loops.loops as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ loops })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
