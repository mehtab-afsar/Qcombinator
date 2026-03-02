import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/objection-bank
// No body — pulls sales_script + gtm_playbook + competitive_matrix for context
// Returns: { bank: { overview, objections[], championingScript, closingResponses[], talkTracks[] } }

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

    const [{ data: scriptArt }, { data: gtmArt }, { data: compArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const script = scriptArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null
    const comp = compArt?.content as Record<string, unknown> | null

    const valueProps = (script?.valueProposition as string[] | undefined)?.slice(0, 3).join('; ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'B2B decision makers'
    const topCompetitor = (comp?.competitors as { name?: string }[] | undefined)?.[0]?.name ?? 'incumbents'

    const prompt = `You are Susi, a sales operations expert. Build a comprehensive objection bank for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
KEY VALUE PROPS: ${valueProps || 'not specified'}
TYPICAL BUYER: ${icp}
MAIN COMPETITOR: ${topCompetitor}

Build a complete objection handling bank for every stage of the sales cycle. Include exact language — not generic tips.

Return JSON only (no markdown):
{
  "overview": "1-sentence summary of the top 3 objection themes",
  "objections": [
    {
      "objection": "exact phrasing the prospect says",
      "category": "price/timing/trust/competition/internal/authority",
      "frequency": "high/medium/low",
      "realMeaning": "what they actually mean / fear behind the objection",
      "response": "exact response script (2-4 sentences)",
      "followUp": "follow-up question to advance the deal",
      "doNotSay": "a common mistake or phrase to avoid"
    }
  ],
  "championingScript": "how to help your internal champion sell it internally — exact talking points for them to use",
  "closingResponses": [
    { "scenario": "stalling scenario (e.g. 'let me think about it')", "response": "exact response", "recoveryCTA": "how to keep momentum" }
  ],
  "talkTracks": [
    {
      "stage": "sales stage (e.g. Discovery / Demo / Proposal / Close)",
      "proactiveStatement": "something to say proactively to prevent objections at this stage"
    }
  ],
  "priceAnchoringTactic": "specific technique to prevent price objections before they happen",
  "negotiationFloor": "guidance on what to concede vs hold firm on"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let bank: Record<string, unknown> = {}
    try { bank = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate objection bank' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'objection_bank_built',
      action_data: { startupName, objectionCount: (bank.objections as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ bank })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
