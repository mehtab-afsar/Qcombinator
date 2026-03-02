import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/pr-strategy
// No body — pulls brand_messaging + gtm_playbook for context
// Returns: { strategy: { overview, targetMedia[], pitchAngles[], pressRelease,
//   mediaKit[], sourcingStrategy[], timing, template, pitfalls[] } }

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

    const [{ data: brandArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const brand = brandArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const oneLiner = (brand?.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'B2B founders'

    const prompt = `You are Maya, a brand strategist. Build a PR and media strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
ONE-LINER: ${oneLiner || 'not specified'}
ICP: ${icp}

Build a realistic DIY PR strategy for a ${stage} founder with no PR budget. Focus on earned media that creates pipeline, not just press coverage.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence PR strategy summary",
  "prGoal": "primary business outcome this PR strategy is designed to achieve",
  "targetMedia": [
    {
      "outlet": "publication or media type (e.g. TechCrunch, Substack newsletters, Podcasts, LinkedIn)",
      "priority": "tier 1 / tier 2 / tier 3",
      "why": "why this outlet matters for your ICP",
      "readership": "who reads this",
      "pitchType": "exclusive/contributed content/podcast guest/expert comment",
      "contactStrategy": "how to get in front of the right journalist or host"
    }
  ],
  "pitchAngles": [
    {
      "angle": "story angle (e.g. contrarian take, data story, founder journey, market timing)",
      "headline": "sample headline",
      "why": "why journalists would care",
      "hook": "first sentence of the pitch"
    }
  ],
  "pressRelease": {
    "headline": "press release headline",
    "subheadline": "supporting subheadline",
    "body": "3-paragraph press release body",
    "boilerplate": "company boilerplate (2 sentences)"
  },
  "mediaKit": ["item 1 to include in your media kit", "item 2", "item 3", "item 4"],
  "sourcingStrategy": [
    { "tactic": "how to get found by journalists (HARO, expert databases, social)", "platform": "where to do it", "timeRequired": "weekly time commitment" }
  ],
  "timing": { "bestMoments": ["ideal news hooks to trigger outreach 1", "hook 2"], "avoidWhen": "when NOT to pitch" },
  "emailTemplate": { "subject": "email subject for cold journalist pitch", "body": "3-paragraph pitch email template" },
  "pitfalls": ["common startup PR mistake to avoid 1", "pitfall 2", "pitfall 3"],
  "quickWin": "fastest thing to do this week to get PR coverage"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate PR strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'pr_strategy_built',
      action_data: { startupName },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
