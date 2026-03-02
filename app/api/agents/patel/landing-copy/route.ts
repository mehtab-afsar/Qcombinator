import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/landing-copy
// No body — pulls gtm_playbook + brand_messaging for ICP/positioning context
// Returns: { copy: { heroHeadline, heroSubheadline, heroCTA, valueProps[], socialProof,
//   featuresSection[], howItWorks[], faq[], closingCTA, metaTitle, metaDescription } }

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

    const [{ data: gtmArt }, { data: brandArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const description = profileData?.description as string ?? ''
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const brand = brandArt?.content as Record<string, unknown> | null

    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'
    const channels = (gtm?.channels as { channel: string }[] | undefined)?.slice(0, 3).map(c => c.channel).join(', ') ?? ''
    const tagline = (brand?.taglines as { tagline: string }[] | undefined)?.[0]?.tagline ?? ''
    const valueProps = (brand?.valueProps as { headline: string; description: string }[] | undefined)?.slice(0, 3) ?? []
    const oneLiner = (brand?.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? description

    const prompt = `You are Patel, a GTM expert. Write complete, conversion-optimised landing page copy for ${startupName}.

CONTEXT:
- Company: ${startupName} — ${oneLiner}
- Tagline: ${tagline || 'not set'}
- Industry: ${industry}
- Target customer (ICP): ${icp}
- Channels: ${channels || 'not set'}
- Value props: ${valueProps.map(v => v.headline).join(', ') || 'not set'}

Write copy that converts. Every line should address a specific objection or move the reader forward. Use the ICP language — their words, not corporate-speak.

Return JSON only (no markdown):
{
  "heroHeadline": "primary hero headline — short, punchy, ICP-specific (max 8 words)",
  "heroSubheadline": "supporting line that adds specificity — what you do, for whom, the outcome (max 20 words)",
  "heroCTA": "primary CTA button text (max 5 words)",
  "valueProps": [
    { "icon": "emoji", "headline": "value prop headline", "body": "2 sentence explanation" }
  ],
  "socialProof": "social proof line — e.g. 'Trusted by 200+ founders at YC, Techstars, and indie hackers'",
  "featuresSection": [
    { "feature": "feature name", "benefit": "what it does for the user", "detail": "1 sentence technical/practical detail" }
  ],
  "howItWorks": [
    { "step": 1, "action": "step action", "description": "what happens + what the user gets" }
  ],
  "faq": [
    { "question": "common objection as a question", "answer": "direct, confident answer" }
  ],
  "closingCTA": { "headline": "final section headline", "body": "2 sentences urgency/FOMO close", "button": "final CTA text" },
  "metaTitle": "SEO title (max 60 chars) — primary keyword + brand",
  "metaDescription": "SEO meta description (max 155 chars) — benefit + keyword + CTA"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let copy: Record<string, unknown> = {}
    try { copy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate landing page copy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'landing_copy_generated',
      action_data: { startupName, hasFAQ: !!(copy.faq) },
    }).maybeSingle()

    return NextResponse.json({ copy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
