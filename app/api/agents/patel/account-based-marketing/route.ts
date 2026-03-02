import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/account-based-marketing
// Body: { targetAccounts?: string[] } — pulls gtm_playbook + icp_document for context
// Returns: { strategy: { overview, targetList[], engagementPlaybook[], contentByStage[],
//   channelMix[], personalization[], metrics[], priorityAccount, priorityAction } }

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

    const body = await req.json().catch(() => ({})) as { targetAccounts?: string[] }

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
      ?? (icp?.summary as string | undefined) ?? 'not specified'
    const topPain = (icp?.topPains as string[] | undefined)?.[0] ?? ''
    const targetAccounts = body.targetAccounts?.slice(0, 5) ?? []
    const accountContext = targetAccounts.length > 0 ? targetAccounts.join(', ') : 'typical enterprise targets'

    const prompt = `You are Patel, a GTM strategist. Build an ABM strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
ICP: ${icpSummary}
TOP PAIN: ${topPain || 'not specified'}
TARGET ACCOUNTS: ${accountContext}

Design an account-based marketing strategy for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence ABM strategy summary",
  "abmTier": "1-1 (enterprise) / 1-few (cluster) / 1-many (programmatic)",
  "targetList": [
    {
      "accountType": "type of account to target",
      "criteria": ["firmographic criterion 1", "criterion 2"],
      "why": "why this account type is high-fit",
      "estimatedCount": "how many accounts exist in this segment",
      "avgDealSize": "estimated deal size"
    }
  ],
  "engagementPlaybook": [
    {
      "stage": "awareness / consideration / decision / expansion",
      "plays": [
        { "play": "specific ABM play", "channel": "channel to use", "content": "what to create", "trigger": "when to run this play" }
      ]
    }
  ],
  "contentByStage": [
    { "buyerStage": "stage in buying journey", "contentType": "what to create", "personalization": "how to customize", "cta": "call to action" }
  ],
  "channelMix": [
    { "channel": "channel name", "role": "awareness/engagement/conversion", "tactics": ["tactic 1", "tactic 2"], "budget": "% of ABM budget" }
  ],
  "personalization": [
    { "dimension": "what to personalize", "approach": "how to personalize at scale", "tools": ["tool to use"] }
  ],
  "metrics": [
    { "metric": "ABM metric", "target": "6-month target", "how": "measurement method" }
  ],
  "priorityAccount": "the single account type to pursue first and why",
  "priorityAction": "the single highest-leverage ABM action to take this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate ABM strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'abm_strategy_built',
      action_data: { startupName, abmTier: strategy.abmTier },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
