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

    // Build the list of posts with their computed schedule timestamps
    const postsToSchedule = posts.slice(0, 30).flatMap(post => {
      const service = post.type === 'twitter' ? 'twitter' : 'linkedin'
      const profile = profileByService[service]
      if (!profile) return []
      const scheduledAt = Math.floor((now + post.day * dayMs) / 1000)
      const schedTs = scheduledAt - (scheduledAt % 86400) + postHour * 3600
      return [{ post, service, profile, schedTs }]
    })

    // Send in parallel batches of 5 to stay within Buffer API rate limits
    const BUFFER_BATCH_SIZE = 5
    for (let i = 0; i < postsToSchedule.length; i += BUFFER_BATCH_SIZE) {
      const batch = postsToSchedule.slice(i, i + BUFFER_BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(({ post, service, profile, schedTs }) =>
          bufferRequest(bufferToken, 'updates/create.json', {
            access_token: bufferToken,
            'profile_ids[]': profile.id,
            text: post.content,
            scheduled_at: String(schedTs),
            now: 'false',
          }).then(result => ({
            day: post.day,
            platform: service,
            text: post.content.slice(0, 60) + (post.content.length > 60 ? '…' : ''),
            bufferId: (result as { updates?: { id: string }[] }).updates?.[0]?.id,
          }))
        )
      )
      for (const outcome of results) {
        if (outcome.status === 'fulfilled') scheduled.push(outcome.value)
        // non-fatal — silently skip failed posts
      }
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
