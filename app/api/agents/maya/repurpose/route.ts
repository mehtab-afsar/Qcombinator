import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/repurpose
// Repurposes a piece of content into multiple formats.
// Body: { content: string, sourceType?: 'blog' | 'email' | 'talk' | 'thread' }
// Returns: { repurposed: { twitterThread[], linkedinPost, emailNewsletter: { subject, preheader, body }, tweetableQuotes[], contentAngle } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { content, sourceType } = body as {
      content: string
      sourceType?: 'blog' | 'email' | 'talk' | 'thread'
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    if (content.length > 6000) {
      return NextResponse.json({ error: 'Content too long (max 6000 characters)' }, { status: 400 })
    }

    const admin = getAdmin()

    const [
      { data: fp },
      { data: brandArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya').eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const brand = (brandArtifact?.content ?? {}) as Record<string, unknown>
    const sp    = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    const voiceContext = brand.brandVoice
      ? `Brand voice: ${brand.brandVoice}${brand.toneAttributes && Array.isArray(brand.toneAttributes) ? ` | Tone: ${(brand.toneAttributes as string[]).join(', ')}` : ''}`
      : sp.solution
      ? `Company: ${fp?.startup_name ?? 'Unknown'} — ${sp.solution}`
      : `Founder: ${fp?.full_name ?? 'Founder'} at ${fp?.startup_name ?? 'Unknown'}`

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Maya, a brand strategist. Repurpose this ${sourceType ?? 'content'} into multiple high-quality formats optimized for each platform.

Return ONLY valid JSON:
{
  "twitterThread": {
    "hook": "the opening hook line",
    "tweets": [
      "Tweet 1 (hook — stop the scroll, max 280 chars)",
      "Tweet 2",
      "Tweet 3",
      "Tweet 4",
      "Tweet 5 (insight or turning point)",
      "Tweet 6 (CTA or closing thought)"
    ]
  },
  "linkedInPost": {
    "hook": "opening line of the LinkedIn post",
    "body": "Full LinkedIn post — 3-5 paragraphs with line breaks, professional-but-human, ends with engagement question"
  },
  "newsletterExcerpt": {
    "subject": "subject line (curiosity or urgency)",
    "preheader": "inbox preview text (1 sentence)",
    "body": "3-4 paragraph newsletter version — warm, direct, ends with a clear CTA"
  },
  "socialGraphicCopy": {
    "headline": "bold 5-7 word headline for a social graphic",
    "subheadline": "12-15 word supporting line",
    "cta": "call-to-action button text"
  },
  "contentAngle": "the core insight that makes this shareable"
}

Write natively for each platform. Twitter = punchy/opinionated. LinkedIn = professional storytelling. Newsletter = warm/helpful.`,
        },
        {
          role: 'user',
          content: `Repurpose this ${sourceType ?? 'content'}:\n\nVoice: ${voiceContext}\n\n---\n${content}\n---`,
        },
      ],
      { maxTokens: 1200, temperature: 0.5 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let repurposed: Record<string, unknown> = {}
    try { repurposed = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { repurposed = m ? JSON.parse(m[0]) : {} } catch { repurposed = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'maya',
      action_type: 'content_repurposed',
      description: `Content repurposed: ${sourceType ?? 'content'} → Twitter thread + LinkedIn + newsletter`,
      metadata:    { sourceType, contentLength: content.length },
    }).then(() => {})

    return NextResponse.json({ repurposed })
  } catch (err) {
    console.error('Maya repurpose POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
