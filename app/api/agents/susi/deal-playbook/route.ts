import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/deal-playbook
// Body: { dealId?: string } — or uses top open deal
// Returns: { playbook: { dealName, stage, nextActions[], talkingPoints[], stakeholderMap[],
//   objectionHandlers[], closingStrategy, timeline, riskFactors[] } }

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

    const body = await req.json().catch(() => ({})) as { dealId?: string }
    const admin = getAdmin()

    const [{ data: deals }, { data: scriptArt }, { data: fp }] = await Promise.all([
      admin.from('deals')
        .select('id, company_name, contact_name, contact_title, stage, deal_value, notes, next_action_date')
        .eq('user_id', user.id)
        .in('stage', ['discovery', 'proposal', 'negotiation', 'closing'])
        .order('deal_value', { ascending: false })
        .limit(10),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    // Pick the target deal
    const targetDeal = body.dealId
      ? deals?.find(d => d.id === body.dealId)
      : deals?.[0]

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const script = scriptArt?.content as Record<string, unknown> | null
    const valueProps = (script?.valueProps as { headline?: string }[] | undefined)
      ?.slice(0, 3).map(v => v.headline ?? '').filter(Boolean).join('; ') ?? ''

    const dealCtx = targetDeal
      ? `Deal: ${targetDeal.company_name} | Contact: ${targetDeal.contact_name} (${targetDeal.contact_title}) | Stage: ${targetDeal.stage} | Value: ${targetDeal.deal_value ?? 'unknown'} | Notes: ${targetDeal.notes ?? 'none'}`
      : 'No specific deal — generate generic best practices'

    const prompt = `You are Susi, a sales expert. Build a deal-winning playbook for ${startupName}.

COMPANY: ${startupName} (${industry})
VALUE PROPS: ${valueProps || 'not set'}
TARGET DEAL: ${dealCtx}

Generate a complete, actionable playbook to close this specific deal (or a generic one if no deal data).

Return JSON only (no markdown):
{
  "dealName": "${targetDeal?.company_name ?? 'Generic Deal'}",
  "currentStage": "${targetDeal?.stage ?? 'discovery'}",
  "dealSize": "${targetDeal?.deal_value ?? 'TBD'}",
  "executiveSummary": "2-sentence assessment of deal health and path to close",
  "nextActions": [
    { "action": "specific next action", "owner": "who", "deadline": "when", "purpose": "why this matters" }
  ],
  "talkingPoints": [
    { "topic": "topic area", "keyMessage": "the message", "proof": "supporting evidence or stat" }
  ],
  "stakeholderMap": [
    { "role": "Champion / Economic Buyer / Technical Buyer / Blocker", "name": "${targetDeal?.contact_name ?? 'TBD'}", "concern": "their primary concern", "approach": "how to engage them" }
  ],
  "objectionHandlers": [
    { "objection": "likely objection at this stage", "handler": "specific response", "followUp": "what to do after handling it" }
  ],
  "closingStrategy": "recommended closing technique and specific ask",
  "estimatedCloseDate": "realistic close date estimate",
  "dealRisks": [
    { "risk": "deal risk", "probability": "high/medium/low", "mitigation": "how to reduce this risk" }
  ],
  "competitivePosition": "how you stack up in this deal specifically",
  "negotiationGuide": { "floorPrice": "minimum acceptable", "walkAwayConditions": "when to walk", "concessions": ["concession you can offer 1", "concession 2"] }
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let playbook: Record<string, unknown> = {}
    try { playbook = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate deal playbook' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'deal_playbook_generated',
      action_data: { startupName, dealName: playbook.dealName, stage: playbook.currentStage },
    }).maybeSingle()

    return NextResponse.json({ playbook, availableDeals: deals?.map(d => ({ id: d.id, company_name: d.company_name, stage: d.stage, deal_value: d.deal_value })) ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
