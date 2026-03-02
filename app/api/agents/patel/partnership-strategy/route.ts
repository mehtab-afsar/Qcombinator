import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/partnership-strategy
// No body — pulls gtm_playbook + icp_document for context
// Returns: { strategy: { overview, partnerTypes[], targetPartners[], outreachTemplates[],
//   valuePropByType, integrationPriorities[], kpis[], pitfalls[], priorityMove } }

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
      ?? (icp?.summary as string | undefined) ?? 'not specified'
    const channels = (gtm?.channels as string[] | undefined)?.slice(0, 3).join(', ') ?? ''
    const problem = (icp?.topPains as string[] | undefined)?.[0] ?? ''

    const prompt = `You are Patel, a GTM strategist. Build a partnership strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
ICP: ${icpSummary}
CURRENT CHANNELS: ${channels || 'not specified'}
CORE PROBLEM SOLVED: ${problem || 'not specified'}

Design a partnership strategy to accelerate distribution. Focus on realistic partnerships for a ${stage} startup.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence partnership strategy summary",
  "partnerTypes": [
    {
      "type": "partner category (e.g. Technology Integration, Channel Reseller, Referral Network, Strategic Alliance)",
      "priority": "high/medium/low",
      "rationale": "why this type matters for us",
      "examplePartners": ["example partner 1", "example partner 2"],
      "valueExchange": "what each side gets",
      "timeToRevenue": "how long before this generates customers"
    }
  ],
  "targetPartners": [
    {
      "partner": "specific company or type",
      "category": "which partner type",
      "audience": "their audience that overlaps with our ICP",
      "approachStrategy": "how to initiate",
      "dealStructure": "revenue share / integration / co-marketing / referral fee",
      "successMetric": "how to measure partnership success"
    }
  ],
  "outreachTemplates": [
    {
      "partnerType": "which partner type",
      "subject": "email subject line",
      "opening": "first 2 sentences of outreach",
      "valueHook": "the partnership value prop in one sentence",
      "cta": "specific call-to-action"
    }
  ],
  "integrationPriorities": [
    { "integration": "specific tool/platform to integrate with", "reason": "why this unlocks distribution", "effort": "low/medium/high", "distributionPotential": "how many new customers this could reach" }
  ],
  "kpis": [
    { "kpi": "partnership KPI", "target": "realistic 6-month target", "leading": "leading indicator to watch" }
  ],
  "pitfalls": ["partnership mistake to avoid 1", "pitfall 2", "pitfall 3"],
  "priorityMove": "the single highest-leverage partnership action to take in the next 30 days"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate partnership strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'partnership_strategy_built',
      action_data: { startupName, partnerTypeCount: (strategy.partnerTypes as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
