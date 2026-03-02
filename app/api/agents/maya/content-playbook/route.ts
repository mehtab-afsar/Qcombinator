import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/content-playbook
// No body — pulls brand_messaging + gtm_playbook for ICP/voice context
// Returns: { playbook: { contentMix[], contentPillars[], channelStrategy[], cadence,
//   contentTypes[], repurposeFlow, toneGuide, topicIdeas[], kpis[], quickWins[] } }

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
    const gtm   = gtmArt?.content   as Record<string, unknown> | null

    const tagline    = (brand?.taglines    as { tagline: string }[]    | undefined)?.[0]?.tagline ?? ''
    const oneLiner   = (brand?.elevatorPitch as { oneLiner?: string }  | undefined)?.oneLiner    ?? ''
    const icp        = (gtm?.icp           as { summary?: string }     | undefined)?.summary     ?? 'early-stage founders'
    const channels   = (gtm?.channels      as { channel: string }[]    | undefined)?.slice(0, 4).map(c => c.channel).join(', ') ?? ''

    const prompt = `You are Maya, a brand strategist. Build a complete content playbook for ${startupName}.

COMPANY: ${startupName} — ${oneLiner || `${stage} ${industry} startup`}
TAGLINE: ${tagline || 'not set'}
ICP: ${icp}
CHANNELS: ${channels || 'not set'}

Create a 90-day content playbook that builds authority, attracts the ICP, and converts. Every piece of content should have a clear distribution plan.

Return JSON only (no markdown):
{
  "contentPillars": [
    { "pillar": "pillar name", "why": "why this matters to ICP", "examples": ["example topic 1", "example topic 2"] }
  ],
  "contentMix": [
    { "format": "LinkedIn post / blog / short video / etc.", "percentage": 30, "why": "why this format" }
  ],
  "channelStrategy": [
    { "channel": "channel name", "contentType": "what to post there", "frequency": "how often", "goal": "what metric to drive" }
  ],
  "cadence": "weekly content calendar overview (e.g. Mon: LinkedIn thought leadership, Wed: Twitter tips, Fri: newsletter)",
  "contentTypes": ["type 1 (long-form, short, video, etc.)", "type 2", "type 3", "type 4"],
  "repurposeFlow": "how to turn 1 piece of content into 5 — the repurposing system",
  "toneGuide": "2-3 sentences on voice, tone, what to always do and never do",
  "topicIdeas": ["specific content idea 1", "specific content idea 2", "specific content idea 3", "idea 4", "idea 5", "idea 6", "idea 7", "idea 8"],
  "kpis": ["metric to track 1 (e.g. LinkedIn follower growth 10%/mo)", "metric 2", "metric 3"],
  "quickWins": ["quick win 1 — can do this week", "quick win 2", "quick win 3"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let playbook: Record<string, unknown> = {}
    try { playbook = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate content playbook' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'content_playbook_generated',
      action_data: { startupName, pillars: (playbook.contentPillars as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ playbook })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
