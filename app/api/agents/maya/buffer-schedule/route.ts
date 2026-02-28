import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/buffer-schedule
// Body: { bufferToken, platforms: ('linkedin'|'twitter')[], artifactId? }
// Generates 30 days of social posts via LLM, schedules them to Buffer

interface BufferProfile {
  id: string
  service: string
  formatted_service: string
}

async function bufferRequest(token: string, path: string, body?: Record<string, unknown>) {
  const url = `https://api.bufferapp.com/1/${path}`
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
      ? new URLSearchParams({
          access_token: token,
          ...Object.fromEntries(
            Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
          ),
        }).toString()
      : undefined,
  })
  const data = await res.json()
  return data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bufferToken, platforms = ['linkedin', 'twitter'], artifactId } = await request.json()
    if (!bufferToken || typeof bufferToken !== 'string') {
      return NextResponse.json({ error: 'bufferToken is required' }, { status: 400 })
    }

    // Get brand messaging artifact for context
    let brandContext = ''
    try {
      const q = supabase
        .from('agent_artifacts')
        .select('content, title')
        .eq('user_id', user.id)
        .eq('artifact_type', 'brand_messaging')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: artifact } = artifactId
        ? await q.eq('id', artifactId)
        : await q

      const item = Array.isArray(artifact) ? artifact[0] : artifact
      if (item?.content) {
        const c = item.content as Record<string, unknown>
        const taglines = (c.taglines as { tagline: string }[] | undefined)?.map(t => t.tagline).join(', ')
        brandContext = [
          c.positioningStatement ? `Positioning: ${c.positioningStatement}` : '',
          taglines ? `Taglines: ${taglines}` : '',
          (c.elevatorPitch as Record<string, unknown> | undefined)?.oneLiner ? `One-liner: ${(c.elevatorPitch as Record<string, unknown>).oneLiner}` : '',
          (c.voiceGuide as Record<string, unknown> | undefined)?.personality
            ? `Voice: ${((c.voiceGuide as Record<string, unknown>).personality as string[]).join(', ')}`
            : '',
        ].filter(Boolean).join('\n')
      }
    } catch { /* use empty context */ }

    // Generate 30 social posts via LLM
    const raw = (await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are a B2B social media strategist. Generate 30 social media posts for a startup's 30-day content calendar. Mix educational (40%), story/behind-the-scenes (30%), and product/value-prop (30%) content. Keep LinkedIn posts to 150 words max, Twitter to 240 chars max. Return ONLY valid JSON (no markdown fences):
{
  "posts": [
    { "day": 1, "type": "linkedin", "content": "...", "hook": "first line that grabs attention" },
    { "day": 1, "type": "twitter", "content": "..." },
    ...
  ]
}`,
        },
        {
          role: 'user',
          content: `Brand context:\n${brandContext || 'A B2B SaaS startup'}\n\nGenerate 15 LinkedIn posts and 15 Twitter posts for a 30-day calendar. Alternate days.`,
        },
      ],
      { maxTokens: 4000, temperature: 0.8 },
    )).trim()
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let posts: { day: number; type: string; content: string }[] = []
    try {
      const parsed = JSON.parse(clean)
      posts = parsed.posts ?? []
    } catch {
      return NextResponse.json({ error: 'Failed to parse generated posts' }, { status: 500 })
    }

    // Get Buffer profiles
    const profilesData = await bufferRequest(bufferToken, `profiles.json?access_token=${bufferToken}`) as BufferProfile[]

    if (!Array.isArray(profilesData) || profilesData.length === 0) {
      return NextResponse.json({ error: 'No Buffer profiles found — connect your social accounts in Buffer first' }, { status: 400 })
    }

    // Filter profiles by requested platforms
    const platformMap: Record<string, string[]> = {
      linkedin: ['linkedin'],
      twitter: ['twitter'],
    }
    const requestedServices = platforms.flatMap((p: string) => platformMap[p] || [p])
    const targetProfiles = profilesData.filter(p => requestedServices.includes(p.service))

    if (!targetProfiles.length) {
      return NextResponse.json({
        error: `No matching Buffer profiles for: ${platforms.join(', ')}. Found: ${profilesData.map(p => p.formatted_service).join(', ')}`,
      }, { status: 400 })
    }

    // Schedule posts to Buffer — one per matching profile type
    const scheduled: { day: number; platform: string; text: string; bufferId?: string }[] = []
    const profileByService: Record<string, BufferProfile> = {}
    for (const p of targetProfiles) {
      profileByService[p.service] = p
    }

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const postHour = 9 // 9am local

    for (const post of posts.slice(0, 30)) {
      const service = post.type === 'twitter' ? 'twitter' : 'linkedin'
      const profile = profileByService[service]
      if (!profile) continue

      // Scheduled time: day N at 9am
      const scheduledAt = Math.floor((now + post.day * dayMs) / 1000)
      // Snap to 9am — approximate by adding offset
      const schedTs = scheduledAt - (scheduledAt % 86400) + postHour * 3600

      try {
        const result = await bufferRequest(bufferToken, 'updates/create.json', {
          access_token: bufferToken,
          'profile_ids[]': profile.id,
          text: post.content,
          scheduled_at: String(schedTs),
          now: 'false',
        }) as { updates?: { id: string }[] }

        scheduled.push({
          day: post.day,
          platform: service,
          text: post.content.slice(0, 60) + (post.content.length > 60 ? '…' : ''),
          bufferId: result.updates?.[0]?.id,
        })
      } catch { /* non-fatal — skip this post */ }
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'maya',
        action_type: 'buffer_schedule',
        description: `Scheduled ${scheduled.length} posts to Buffer (${platforms.join(', ')})`,
        metadata: { scheduled: scheduled.length, platforms, artifactId },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      scheduled: scheduled.length,
      posts: scheduled,
      totalGenerated: posts.length,
      profiles: targetProfiles.map(p => p.formatted_service),
    })
  } catch (err) {
    console.error('Maya Buffer schedule error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
