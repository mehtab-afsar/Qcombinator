import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/churn-analysis
// No body — pulls pmf_survey + customer_insight + qscore_history for context
// Returns: { analysis: { verdict, churnRate, segments[], rootCauses[], earlyWarnings[],
//   retentionPlaybook[], winbackCampaign, healthScoreFramework, churnPrevention[], priority } }

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

    const pmfScore = (pmf?.pmfScore as number | undefined) ?? (assessment?.pmfScore as number | undefined) ?? 'unknown'
    const topPains = (cust?.topPains as string[] | undefined)?.slice(0, 3).join(', ') ?? ''
    const retention = (assessment?.retentionRate as string | undefined) ?? 'unknown'
    const mrr = (assessment?.mrr as string | undefined) ?? 'unknown'

    const prompt = `You are Nova, a product-market fit expert. Conduct a churn analysis for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PMF SCORE: ${pmfScore}/100
RETENTION RATE: ${retention}
MRR: ${mrr}
TOP CUSTOMER PAINS: ${topPains || 'not specified'}

Diagnose churn causes and build a retention playbook for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "verdict": "1-sentence churn health assessment",
  "churnRate": "estimated monthly churn % for this stage",
  "benchmarkChurn": "typical churn for ${stage} ${industry} startups",
  "segments": [
    {
      "segment": "customer segment name",
      "churnRisk": "low/medium/high",
      "whyTheyChurn": "primary churn reason",
      "retentionTactic": "specific tactic for this segment",
      "signalToWatch": "early warning indicator"
    }
  ],
  "rootCauses": [
    { "cause": "root cause of churn", "frequency": "how common", "impact": "revenue impact", "fix": "how to address" }
  ],
  "earlyWarnings": [
    { "signal": "behavioral signal", "threshold": "when to act", "action": "what to do immediately", "owner": "who acts on this" }
  ],
  "retentionPlaybook": [
    { "stage": "onboarding/adoption/renewal/expansion", "tactic": "specific retention action", "timing": "when to deploy", "expectedLift": "estimated churn reduction" }
  ],
  "winbackCampaign": {
    "targetSegment": "which churned customers to win back",
    "message": "win-back email opening",
    "offer": "what to offer",
    "timing": "when to send after churn"
  },
  "healthScoreFramework": {
    "metrics": ["metric 1", "metric 2", "metric 3"],
    "greenThreshold": "what healthy looks like",
    "redThreshold": "churn risk threshold",
    "checkFrequency": "how often to review"
  },
  "churnPrevention": ["proactive prevention tactic 1", "tactic 2", "tactic 3"],
  "priority": "the single highest-leverage anti-churn action to take this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate churn analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'churn_analyzed',
      action_data: { startupName, churnRate: analysis.churnRate },
    }).maybeSingle()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
