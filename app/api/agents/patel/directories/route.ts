import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/directories
// Generates submission-ready copy for Product Hunt, HackerNews Show HN, BetaList, Indie Hackers,
// and relevant vertical directories.
// No body required — pulls from founder_profiles and latest artifacts.

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

    const [fpRes, brandRes, icpRes] = await Promise.all([
      admin.from('founder_profiles').select('full_name, startup_name, industry, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya').eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel').eq('artifact_type', 'icp_document').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fp = fpRes.data
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const brand = (brandRes.data?.content ?? {}) as Record<string, unknown>
    const icp = (icpRes.data?.content ?? {}) as Record<string, unknown>

    const company = fp?.startup_name ?? 'the startup'
    const tagline = (brand.tagline as string) ?? (sp.tagline as string) ?? ''
    const solution = (sp.solution as string) ?? (brand.valueProposition as string) ?? ''
    const problem = (sp.problem as string) ?? ''
    const industry = fp?.industry ?? ''
    const targetCustomer = (icp.targetProfile as string) ?? (sp.targetCustomer as string) ?? ''

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Patel, a GTM advisor. Generate submission-ready copy for startup directories and launch platforms. Each entry must be optimized for the specific platform's format and audience.

Return ONLY valid JSON:
{
  "productHunt": {
    "name": "product name",
    "tagline": "product tagline (max 60 chars — punchy, benefit-focused)",
    "description": "longer description for the Product Hunt page (150-200 words)",
    "topics": ["2-3 most relevant Product Hunt topics"],
    "firstComment": "the founder's first comment on launch day (personal, authentic, 100-150 words)",
    "hunterNote": "brief note to a potential hunter explaining why they should hunt this"
  },
  "hackerNews": {
    "title": "Show HN: [title] — one sentence that explains what it does and who it's for",
    "body": "the HN post body — lead with the problem, explain your approach, invite technical feedback (200-250 words). No marketing language.",
    "timing": "best time to post on HN — day and time"
  },
  "betaList": {
    "headline": "headline (max 70 chars)",
    "description": "1-2 paragraph description for BetaList audience (early adopters, makers)",
    "callToAction": "what you want early users to do"
  },
  "indieHackers": {
    "title": "product listing title",
    "description": "description for Indie Hackers audience — include how you built it, current revenue/traction if any",
    "milestone": "milestone post angle — e.g. 'From 0 to 100 users in 30 days without paid ads'"
  },
  "verticalDirectories": [
    { "directory": "name of a vertical directory relevant to this product", "url": "approximate URL", "submissionTip": "what to emphasize for this directory's audience" }
  ],
  "launchChecklist": ["5 things to do in the 48 hours before launch"]
}`,
        },
        {
          role: 'user',
          content: `Generate directory submissions for:
Company: ${company}
${tagline ? `Tagline: ${tagline}` : ''}
${solution ? `What we do: ${solution}` : ''}
${problem ? `Problem we solve: ${problem}` : ''}
${industry ? `Industry: ${industry}` : ''}
${targetCustomer ? `Target customer: ${targetCustomer}` : ''}`,
        },
      ],
      { maxTokens: 1200, temperature: 0.5 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'patel',
      action_type: 'directory_submissions_generated',
      description: `Directory submissions generated for ${company} (Product Hunt, HN, BetaList, IH)`,
      metadata:    { company },
    }).then(() => {})

    return NextResponse.json({ result, company })
  } catch (err) {
    console.error('Patel directories POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
