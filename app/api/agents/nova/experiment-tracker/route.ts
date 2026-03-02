import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/experiment-tracker
// Body: { hypothesis: string, metric: string, variants?: string[], duration?: string }
// Returns: { experiment: { id, hypothesis, metric, variants[], successCriteria, trackingPlan,
//   statisticalPower, sampleSizeNeeded, timeline, risksAndMitigations[], readoutTemplate } }

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
      hypothesis?: string; metric?: string; variants?: string[]; duration?: string
    }

    const admin = getAdmin()

    const { data: fp } = await admin.from('founder_profiles')
      .select('startup_name, startup_profile_data').eq('user_id', user.id).single()

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const hypothesis = body.hypothesis ?? 'We believe that improving X will increase Y'
    const metric = body.metric ?? 'conversion rate'
    const variants = body.variants?.join(', ') ?? 'Control vs. Treatment'
    const duration = body.duration ?? '2 weeks'

    const prompt = `You are Nova, a product researcher. Design a rigorous experiment for ${startupName}.

COMPANY: ${startupName} (${industry})
HYPOTHESIS: ${hypothesis}
PRIMARY METRIC: ${metric}
VARIANTS: ${variants}
PLANNED DURATION: ${duration}

Design a complete, scientifically sound experiment plan.

Return JSON only (no markdown):
{
  "experimentTitle": "short descriptive name",
  "hypothesis": "refined if/then/because hypothesis statement",
  "nullHypothesis": "what the null hypothesis is",
  "primaryMetric": { "name": "${metric}", "measurement": "how to measure it exactly", "baseline": "estimated current value" },
  "secondaryMetrics": ["guardrail metric 1", "guardrail metric 2"],
  "variants": [
    { "name": "Control", "description": "what stays the same" },
    { "name": "Treatment", "description": "what changes" }
  ],
  "successCriteria": "specific threshold — e.g. 10% lift in conversion rate with p < 0.05",
  "sampleSizeNeeded": "estimated per variant (with brief reasoning)",
  "statisticalPower": "80% power at 5% significance — or adjusted",
  "timeline": { "setup": "time to set up", "runtime": "${duration}", "analysis": "time to analyze" },
  "trackingPlan": ["event/signal to track 1", "event 2", "event 3"],
  "segmentBreakdown": ["segment to analyze separately 1", "segment 2"],
  "risksAndMitigations": [
    { "risk": "risk description", "mitigation": "how to handle" }
  ],
  "readoutTemplate": "2-sentence template for how to report results — e.g. 'We tested X and observed Y, which means Z. We recommend...'",
  "stopEarlyCriteria": "condition under which to stop the experiment early"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 800 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let experiment: Record<string, unknown> = {}
    try { experiment = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate experiment plan' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'experiment_designed',
      action_data: { startupName, metric, hypothesis: hypothesis.slice(0, 80) },
    }).maybeSingle()

    return NextResponse.json({ experiment })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
