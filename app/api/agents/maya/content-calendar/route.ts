import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/content-calendar
// Body: { weeks?: number } — pulls brand_messaging + gtm_playbook for context
// Returns: { calendar: { overview, weeks[], contentPillars[], repurposeGuide[], toolStack[], kpis[] } }

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

    const body = await req.json().catch(() => ({})) as { weeks?: number }

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

    const tagline = (brand?.tagline as string | undefined) ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'not specified'
    const channels = (gtm?.channels as string[] | undefined)?.slice(0, 3).join(', ') ?? ''
    const weeks = body.weeks ?? 4

    const prompt = `You are Maya, a content and brand strategist. Build a ${weeks}-week content calendar for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
TAGLINE: ${tagline || 'not specified'}
ICP: ${icp}
CHANNELS: ${channels || 'not specified'}

Create a realistic, actionable content calendar for a ${stage} ${industry} startup with limited bandwidth.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence content strategy summary",
  "contentPillars": [
    { "pillar": "content pillar name", "purpose": "what it achieves", "formats": ["format1", "format2"], "frequency": "posts per week" }
  ],
  "weeks": [
    {
      "week": 1,
      "theme": "weekly theme / focus",
      "posts": [
        {
          "day": "Monday",
          "platform": "LinkedIn / Twitter / Blog / Newsletter",
          "pillar": "which content pillar",
          "format": "text / image / video / thread / long-form",
          "hook": "attention-grabbing opening line",
          "angle": "the story angle or message",
          "cta": "call to action",
          "effort": "low/medium/high"
        }
      ]
    }
  ],
  "repurposeGuide": [
    { "original": "content type to create once", "repurpose": ["platform/format to repurpose into"], "effort": "time saved" }
  ],
  "toolStack": [
    { "tool": "recommended tool", "purpose": "what it does", "cost": "free / paid", "priority": "must-have / nice-to-have" }
  ],
  "kpis": [
    { "metric": "content KPI", "target": "30-day target", "how": "how to measure" }
  ],
  "batchingStrategy": "how to batch-create content efficiently (e.g. 2-hour Sunday session)"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let calendar: Record<string, unknown> = {}
    try { calendar = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate content calendar' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'content_calendar_built',
      action_data: { startupName, weeks },
    }).maybeSingle()

    return NextResponse.json({ calendar })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
