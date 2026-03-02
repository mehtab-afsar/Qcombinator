import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/user-segmentation
// No body — pulls pmf_survey + user_personas artifacts for context
// Returns: { segmentation: { verdict, segments[], segmentMatrix[], behavioralSignals[],
//   segmentStrategy[], monetizationBySegment[], prioritySegment, priorityAction } }

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

    const [{ data: pmfArt }, { data: personasArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'user_personas').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'
    const description = profileData?.description as string ?? ''

    const pmf = pmfArt?.content as Record<string, unknown> | null
    const personas = personasArt?.content as Record<string, unknown> | null

    const pmfSummary = (pmf?.insight as string | undefined) ?? (pmf?.summary as string | undefined) ?? ''
    const personaSummary = (personas?.primaryPersona as Record<string, unknown> | undefined)?.name
      ? `Primary persona: ${String((personas?.primaryPersona as Record<string, unknown>)?.name)}`
      : ''

    const prompt = `You are Nova, a growth and product researcher. Build a user segmentation model for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
DESCRIPTION: ${description || 'not provided'}
PMF INSIGHT: ${pmfSummary || 'not available'}
PERSONA CONTEXT: ${personaSummary || 'not available'}

Design a behavioral user segmentation model with actionable strategies per segment.

Return JSON only (no markdown):
{
  "verdict": "1-sentence user segmentation opportunity assessment",
  "segmentationModel": "RFM / Behavioral / Job-to-be-done / Feature Usage / Lifecycle",
  "segments": [
    {
      "name": "segment name (e.g. Power Users, Casual Dabblers, Churners)",
      "size": "estimated % of user base",
      "behaviorSignature": "how this segment behaves in your product",
      "jobToBeDone": "what they're hiring your product to do",
      "retentionRisk": "high / medium / low",
      "revenueContribution": "estimated % of revenue",
      "keyTrigger": "what causes them to upgrade or churn"
    }
  ],
  "segmentMatrix": [
    {
      "segment": "segment name",
      "engagementLevel": "high / medium / low",
      "revenueLevel": "high / medium / low",
      "growthPotential": "high / medium / low",
      "priority": "tier 1 / tier 2 / tier 3"
    }
  ],
  "behavioralSignals": [
    {
      "signal": "in-product behavioral signal",
      "meaning": "what it predicts",
      "action": "what to do when detected"
    }
  ],
  "segmentStrategy": [
    {
      "segment": "segment name",
      "goal": "retain / expand / convert / win-back",
      "tactics": ["specific tactic 1", "tactic 2"],
      "messaging": "what to say to this segment",
      "channel": "best channel to reach them"
    }
  ],
  "monetizationBySegment": [
    {
      "segment": "segment name",
      "currentRevenue": "current contribution",
      "expansionPlay": "upsell / cross-sell / plan upgrade opportunity",
      "revenueOpportunity": "estimated additional revenue"
    }
  ],
  "prioritySegment": "the single segment to focus on first and why",
  "priorityAction": "single most impactful segmentation action to take this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let segmentation: Record<string, unknown> = {}
    try { segmentation = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate user segmentation' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'user_segmentation_built',
      action_data: { startupName, segmentationModel: segmentation.segmentationModel },
    }).maybeSingle()

    return NextResponse.json({ segmentation })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
