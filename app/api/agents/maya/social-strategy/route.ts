import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/social-strategy
// No body — pulls brand_messaging + content_playbook + gtm_playbook for context
// Returns: { strategy: { overview, platforms[], contentPillars[], postingCalendar,
//   growthTactics[], contentFormats[], kpis[], quickWins[], toolStack[] } }

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

    const [{ data: brandArt }, { data: contentArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'content_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const brand = brandArt?.content as Record<string, unknown> | null
    const content = contentArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const tone = (brand?.voiceTone as { adjectives?: string[] } | undefined)?.adjectives?.join(', ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'
    const pillars = (content?.contentPillars as string[] | undefined)?.slice(0, 3).join(', ') ?? ''

    const prompt = `You are Maya, a brand strategist. Build a social media strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
BRAND TONE: ${tone || 'professional, clear, founder-friendly'}
ICP: ${icp}
CONTENT PILLARS: ${pillars || 'not specified'}

Design a realistic social media strategy for a ${stage} startup founder who is building in public. Focus on channels that drive B2B pipeline, not just followers.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence social strategy summary",
  "platforms": [
    {
      "platform": "platform name (e.g. LinkedIn, Twitter/X, YouTube, Newsletter)",
      "priority": "primary/secondary/optional",
      "why": "why this platform for this ICP",
      "goal": "main goal (awareness/pipeline/community/SEO)",
      "postingFrequency": "posts per week",
      "contentMix": "what types of content (e.g. 40% insights, 30% stories, 20% product, 10% engagement)",
      "bestTimes": "optimal posting times"
    }
  ],
  "contentPillars": [
    {
      "pillar": "content theme",
      "description": "what this pillar is about",
      "formats": ["format 1", "format 2"],
      "exampleTopics": ["topic idea 1", "topic idea 2", "topic idea 3"]
    }
  ],
  "postingCalendar": {
    "monday": "content type / pillar",
    "tuesday": "content type / pillar",
    "wednesday": "content type / pillar",
    "thursday": "content type / pillar",
    "friday": "content type / pillar"
  },
  "growthTactics": [
    { "tactic": "specific growth tactic", "platform": "where to apply it", "effort": "low/medium/high", "expectedResult": "what it drives" }
  ],
  "contentFormats": [
    { "format": "content format (e.g. Thread, Carousel, Case Study, Podcast clip)", "platform": "best platform", "why": "why this format works", "template": "quick template or hook idea" }
  ],
  "kpis": [
    { "metric": "social KPI", "platform": "platform", "target30d": "30-day target", "target90d": "90-day target", "howToMeasure": "tool or method" }
  ],
  "quickWins": ["quick win to implement in day 1", "day 2 quick win", "day 3 quick win"],
  "toolStack": ["recommended tool 1 (purpose)", "tool 2 (purpose)", "tool 3 (purpose)"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate social strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'social_strategy_built',
      action_data: { startupName, platformCount: (strategy.platforms as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
