import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/user-personas
// No body — pulls pmf_survey + gtm_playbook for ICP + customer data
// Returns: { personas: [{ name, avatar, role, demographics, goals[], frustrations[],
//   buyingTriggers[], objections[], dayInLife, quotableQuote, channelsTheyUse[],
//   contentTheyConsume[], howToReach, willingness, decisionProcess }] }

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

    const [{ data: _pmfArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry    = profileData?.industry    as string ?? 'B2B SaaS'
    const description = profileData?.description as string ?? ''
    const stage       = profileData?.stage       as string ?? 'Seed'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const icp = (gtm?.icp as { summary?: string; title?: string; companySize?: string } | undefined)
    const icpCtx = icp
      ? `ICP: ${icp.summary ?? ''} | Title: ${icp.title ?? ''} | Company size: ${icp.companySize ?? ''}`
      : 'ICP: not set'

    const prompt = `You are Nova, a customer research expert. Build 3 detailed user personas for ${startupName}.

COMPANY: ${startupName} — ${description || `${stage} ${industry} startup`}
${icpCtx}

Create 3 distinct personas that represent real segments of the target market — not archetypes, but specific, believable people. Make them feel real.

Return JSON only (no markdown):
{
  "personas": [
    {
      "name": "fictional first name + last initial",
      "avatar": "emoji that represents this person",
      "role": "exact job title",
      "demographics": "age range, company size/type, location, years of experience",
      "goals": ["primary professional goal", "secondary goal related to your product"],
      "frustrations": ["frustration 1 (your product solves this)", "frustration 2", "frustration 3"],
      "buyingTriggers": ["what event makes them suddenly need to buy 1", "trigger 2"],
      "objections": ["objection they raise before buying 1", "objection 2"],
      "dayInLife": "2-sentence description of a typical day for this person and where your product fits",
      "quotableQuote": "something this person might actually say — their words, not yours",
      "channelsTheyUse": ["LinkedIn", "Slack communities", "etc."],
      "contentTheyConsume": ["what they read/watch to stay current"],
      "howToReach": "the best way to get in front of this persona",
      "willingness": "high / medium / low — how willing they are to pay for a solution",
      "decisionProcess": "how they evaluate and buy software — solo / committee / top-down / bottoms-up"
    }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: { personas?: unknown[] } = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate user personas' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'user_personas_generated',
      action_data: { startupName, personaCount: (result.personas ?? []).length },
    }).maybeSingle()

    return NextResponse.json({ personas: result.personas ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
