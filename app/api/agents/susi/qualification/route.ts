import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/qualification
// Body: { dealId?: string } — optional; if omitted, scores all open deals
// Pulls deal data + competitive_matrix + gtm_playbook for ICP context
// Returns: { scorecards: [{ dealId, company, framework, score, grade, criteria[], keyRisk, recommendation, nextQuestion }] }

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

    const [dealsQuery, { data: _matrixArtifact }, { data: gtmArtifact }, { data: fp }] = await Promise.all([
      body.dealId
        ? admin.from('deals').select('id, company, stage, value, contact_name, contact_title, notes, created_at, updated_at').eq('user_id', user.id).eq('id', body.dealId).limit(1)
        : admin.from('deals').select('id, company, stage, value, contact_name, contact_title, notes, created_at, updated_at').eq('user_id', user.id).not('stage', 'in', '("won","lost")').order('updated_at', { ascending: false }).limit(8),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const deals = dealsQuery.data ?? []
    if (deals.length === 0) {
      return NextResponse.json({ error: 'No open deals to qualify. Add deals in the pipeline first.' }, { status: 400 })
    }

    const startupName = fp?.startup_name ?? 'Your startup'
    const icp = (gtmArtifact?.content as { icp?: { summary?: string } } | null)?.icp?.summary ?? 'early-stage tech companies'
    const productDesc = (fp?.startup_profile_data as { description?: string } | null)?.description ?? ''
    const industry = (fp?.startup_profile_data as { industry?: string } | null)?.industry ?? 'B2B SaaS'

    const dealsSummary = deals.map(d => {
      const daysSinceCreate = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000)
      const daysSinceUpdate = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)
      return `- ${d.company} | Stage: ${d.stage} | Value: ${d.value ?? 'unknown'} | Contact: ${d.contact_name ?? 'unknown'} (${d.contact_title ?? 'unknown title'}) | Notes: "${(d.notes ?? '').slice(0, 120)}" | Created ${daysSinceCreate}d ago, last update ${daysSinceUpdate}d ago`
    }).join('\n')

    const prompt = `You are Susi, a B2B sales expert. Apply a BANT + MEDDIC qualification framework to score these open deals for ${startupName} (${industry}).

STARTUP: ${startupName}${productDesc ? ` — ${productDesc}` : ''}
IDEAL CUSTOMER PROFILE: ${icp}

OPEN DEALS:
${dealsSummary}

For each deal, score BANT + MEDDIC criteria and produce a qualification verdict.

BANT: Budget (has budget?), Authority (decision-maker?), Need (clear pain?), Timeline (defined?)
MEDDIC: Metrics (ROI/success metrics defined?), Economic Buyer (identified?), Decision Criteria (known?), Decision Process (understood?), Identify Pain (explicit problem?), Champion (internal advocate?)

Return JSON only (no markdown):
{
  "scorecards": [
    {
      "dealId": "deal id from input",
      "company": "company name",
      "framework": "BANT" | "MEDDIC" | "BANT+MEDDIC",
      "score": 0-100,
      "grade": "A" | "B" | "C" | "D",
      "criteria": [
        { "name": "Budget | Authority | Need | Timeline | Metrics | Economic Buyer | Decision Criteria | Decision Process | Pain | Champion", "met": true | false, "evidence": "what from notes/stage supports this", "weight": 1-3 }
      ],
      "keyRisk": "single biggest qualification gap",
      "recommendation": "advance | nurture | disqualify | get more info",
      "nextQuestion": "most important question to ask the prospect right now"
    }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: { scorecards?: unknown[] } = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate qualification scorecards' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'deals_qualified',
      action_data: { dealsScored: (result.scorecards ?? []).length },
    }).maybeSingle()

    return NextResponse.json({ scorecards: result.scorecards ?? [], dealsScored: (result.scorecards ?? []).length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
