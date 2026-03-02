import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/pipeline-health
// No body — pulls sales_script + deal data + gtm_playbook for context
// Returns: { health: { verdict, pipelineCoverage, stageBreakdown[], staleDealRisk,
//   velocityAnalysis, conversionRates[], forecastAccuracy, fixes[], priorityAction } }

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

    const [{ data: salesArt }, { data: gtmArt }, { data: fp }, { data: deals }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('deals').select('stage, deal_value, probability, created_at, next_action_date')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const sales = salesArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const dealCount = deals?.length ?? 0
    const totalPipelineValue = deals?.reduce((sum, d) => sum + (d.deal_value ?? 0), 0) ?? 0
    const stageCount = deals?.reduce((acc, d) => {
      acc[d.stage] = (acc[d.stage] ?? 0) + 1
      return acc
    }, {} as Record<string, number>) ?? {}
    const avgDealValue = dealCount > 0 ? Math.round(totalPipelineValue / dealCount) : 0
    const avgCycleTime = (sales?.avgCycleDays as number | undefined) ?? 30
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'not specified'

    const prompt = `You are Susi, a sales strategist. Analyze pipeline health for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
TOTAL DEALS IN PIPELINE: ${dealCount}
TOTAL PIPELINE VALUE: $${totalPipelineValue.toLocaleString()}
AVG DEAL VALUE: $${avgDealValue.toLocaleString()}
DEAL STAGE DISTRIBUTION: ${JSON.stringify(stageCount)}
AVG SALES CYCLE: ~${avgCycleTime} days
ICP: ${icp}

Diagnose pipeline health and forecast accuracy. Identify bottlenecks and prescribe fixes.

Return JSON only (no markdown):
{
  "verdict": "1-sentence pipeline health assessment",
  "pipelineCoverage": "pipeline value vs quarterly target estimate (e.g. 2.4x coverage)",
  "pipelineHealth": "at risk / on track / strong",
  "stageBreakdown": [
    {
      "stage": "pipeline stage name",
      "dealCount": "number of deals",
      "avgTimeInStage": "typical days in this stage",
      "conversionRate": "conversion to next stage %",
      "stuckRisk": "low/medium/high",
      "action": "what to do for stuck deals here"
    }
  ],
  "staleDealRisk": {
    "estimatedStaleCount": "number likely stale",
    "staleCriteria": "what makes a deal stale",
    "recoveryTactics": ["tactic 1", "tactic 2"]
  },
  "velocityAnalysis": {
    "currentVelocity": "estimated deals closed per month",
    "targetVelocity": "velocity needed to hit quota",
    "bottleneck": "where deals get stuck most",
    "speedUpTactic": "how to increase velocity"
  },
  "conversionRates": [
    { "transition": "stage A → stage B", "current": "estimated conversion %", "benchmark": "typical benchmark", "gap": "improvement needed" }
  ],
  "forecastAccuracy": {
    "estimatedAccuracy": "% of committed deals that typically close",
    "upside": "deals that could close if worked",
    "riskDeals": "deals at risk of slipping"
  },
  "fixes": [
    { "issue": "pipeline problem", "impact": "revenue at risk", "fix": "specific action", "timeframe": "when to execute" }
  ],
  "priorityAction": "single most impactful pipeline action to take this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let health: Record<string, unknown> = {}
    try { health = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate pipeline health analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'pipeline_health_analyzed',
      action_data: { startupName, dealCount, pipelineHealth: health.pipelineHealth },
    }).maybeSingle()

    return NextResponse.json({ health })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
