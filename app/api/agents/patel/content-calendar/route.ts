import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

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

    const [gtmRes, brandRes, fpRes] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, tagline, industry, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const gtm   = (gtmRes.data?.content ?? {}) as Record<string, unknown>
    const brand = (brandRes.data?.content ?? {}) as Record<string, unknown>
    const fp    = fpRes.data
    const sp    = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    const context = [
      `Company: ${fp?.startup_name ?? 'Unknown'}`,
      fp?.tagline ? `Tagline: ${fp.tagline}` : '',
      fp?.industry ? `Industry: ${fp.industry}` : '',
      brand.positioningStatement ? `Positioning: ${brand.positioningStatement}` : '',
      (brand.toneOfVoice as string) ?? (brand.brandVoice as string) ? `Brand voice: ${(brand.toneOfVoice ?? brand.brandVoice) as string}` : '',
      gtm.targetMarket ? `Target market: ${gtm.targetMarket as string}` : '',
      Array.isArray(gtm.channels) ? `Top channels: ${(gtm.channels as string[]).join(', ')}` : '',
      (sp.oneLiner as string) ? `One liner: ${sp.oneLiner as string}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Patel, a GTM strategist. Generate a 4-week social media content calendar with FULLY WRITTEN posts ready to paste.

Return ONLY valid JSON:
{
  "weeks": [
    {
      "week": 1,
      "theme": "short theme name",
      "objective": "what this week achieves",
      "posts": [
        {
          "day": "Monday",
          "platform": "LinkedIn",
          "type": "thought_leadership",
          "hook": "first line to stop the scroll (max 20 words)",
          "body": "full post text, platform-appropriate, ready to paste",
          "cta": "call to action (optional)",
          "hashtags": ["2-3 hashtags"]
        }
      ]
    }
  ],
  "contentPillars": ["3-4 core content themes"],
  "growthTip": "1 tactical tip to grow reach this month"
}

Rules:
- Week 1: Problem awareness, Week 2: Solution, Week 3: Social proof, Week 4: CTA/conversion
- 3 posts per week (Mon/Wed/Fri), alternate LinkedIn and Twitter
- LinkedIn: 150-250 words, line breaks, professional
- Twitter: max 260 chars, punchy, 1-2 emojis ok
- Every post must be genuinely useful, not promotional filler`,
        },
        { role: 'user', content: `Generate 4-week calendar for:\n${context || 'Early-stage B2B SaaS startup'}` },
      ],
      { maxTokens: 2000, temperature: 0.6 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'patel',
      action_type: 'content_calendar_generated',
      description: `4-week content calendar generated`,
      metadata:    { company: fp?.startup_name },
    })

    return NextResponse.json({ calendar: parsed })
  } catch (err) {
    console.error('Patel content calendar error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
