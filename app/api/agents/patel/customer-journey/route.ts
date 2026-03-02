import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/customer-journey
// No body — pulls gtm_playbook + icp_document + outreach_sequence for context
// Returns: { journey: { stages[], touchpoints[], emotionalArc[], frictionPoints[],
//   optimizations[], metrics[], toolStack[], journeyStatement } }

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

    const [{ data: gtmArt }, { data: icpArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'icp_document').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const icp = icpArt?.content as Record<string, unknown> | null

    const icpSummary = (gtm?.icp as { summary?: string } | undefined)?.summary
      ?? (icp?.summary as string | undefined) ?? 'early-stage founders'
    const channels = (gtm?.channels as string[] | undefined)?.slice(0, 3).join(', ') ?? 'various channels'
    const buyingTriggers = (icp?.buyingTriggers as string[] | undefined)?.slice(0, 2).join('; ') ?? ''

    const prompt = `You are Patel, a GTM expert. Map the full customer journey for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
ICP: ${icpSummary}
CHANNELS: ${channels}
BUYING TRIGGERS: ${buyingTriggers || 'not specified'}

Map the end-to-end customer journey from first awareness to advocacy. Be specific about what the ICP experiences at each stage.

Return JSON only (no markdown):
{
  "journeyStatement": "1-sentence summary of the ideal customer journey",
  "stages": [
    {
      "stage": "stage name (Awareness/Consideration/Decision/Onboarding/Activation/Retention/Advocacy)",
      "customerGoal": "what the customer is trying to accomplish",
      "touchpoints": ["touchpoint 1", "touchpoint 2", "touchpoint 3"],
      "customerEmotion": "how the customer feels (confused/curious/excited/anxious/satisfied/etc.)",
      "companyAction": "what the company does/should do at this stage",
      "keyMetric": "metric that defines success at this stage",
      "successLooksLike": "specific outcome that advances to next stage",
      "frictionPoints": ["friction 1", "friction 2"],
      "optimization": "highest-leverage improvement at this stage"
    }
  ],
  "criticalMoments": [
    { "moment": "defining moment name", "stage": "which stage", "description": "why this moment is make-or-break", "howToNail": "specific action to win this moment" }
  ],
  "frictionInventory": [
    { "friction": "specific friction point", "stage": "where it occurs", "severity": "high/medium/low", "fix": "how to remove it" }
  ],
  "metrics": [
    { "stage": "stage name", "metric": "metric to track", "benchmark": "good benchmark value" }
  ],
  "toolStack": [
    { "stage": "stage name", "tool": "recommended tool", "purpose": "what it does" }
  ],
  "quickWins": [
    "single most impactful journey optimization to implement now 1",
    "quick win 2"
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let journey: Record<string, unknown> = {}
    try { journey = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate customer journey' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'customer_journey_mapped',
      action_data: { startupName, stageCount: (journey.stages as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ journey })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
