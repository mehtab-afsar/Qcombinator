import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/brand-audit
// No body — pulls brand_messaging + gtm_playbook + content_playbook for context
// Returns: { audit: { overallScore, dimensions[], quickFixes[], strategic[], consistency,
//   voiceAssessment, visualGuidance[], competitorBrandGaps[] } }

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

    const taglines = (brand?.taglines as { tagline: string }[] | undefined)?.slice(0, 2).map(t => t.tagline).join(' / ') ?? ''
    const oneLiner = (brand?.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'
    const tone = (brand?.voiceTone as { adjectives?: string[] } | undefined)?.adjectives?.join(', ') ?? ''

    const prompt = `You are Maya, a brand strategist. Run a brand audit for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
TAGLINE: ${taglines || 'not set'}
ONE-LINER: ${oneLiner || 'not set'}
ICP: ${icp}
VOICE/TONE: ${tone || 'not set'}

Assess brand health across key dimensions. Be specific and actionable — this is for a startup that may have no brand team.

Return JSON only (no markdown):
{
  "overallScore": 72,
  "overallVerdict": "1-sentence overall brand health assessment",
  "dimensions": [
    {
      "dimension": "dimension name (e.g. Clarity, Consistency, Differentiation, Emotional Resonance, Visual Identity)",
      "score": 75,
      "rating": "strong / good / needs work / critical",
      "finding": "what we found",
      "gap": "what's missing",
      "quickFix": "fastest thing to improve this dimension"
    }
  ],
  "quickFixes": [
    { "fix": "specific quick fix", "effort": "1 hour / 1 day / 1 week", "impact": "high/medium/low", "why": "why this matters" }
  ],
  "strategicImprovements": [
    { "improvement": "strategic brand initiative", "effort": "weeks/months", "impact": "high/medium", "description": "what it involves" }
  ],
  "consistencyAudit": {
    "score": 65,
    "issues": ["consistency issue 1", "issue 2"],
    "recommendation": "what to standardize first"
  },
  "voiceAssessment": {
    "currentVoice": "how the brand currently sounds",
    "idealVoice": "how it should sound for the ICP",
    "gap": "what to change",
    "examples": ["phrase to avoid", "better alternative"]
  },
  "visualGuidance": [
    "visual identity recommendation 1 (colors, fonts, imagery style)",
    "recommendation 2",
    "recommendation 3"
  ],
  "competitorBrandGaps": ["brand territory competitor isn't owning that you could 1", "gap 2"],
  "priorityAction": "the single most impactful brand action to take in the next 30 days"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let audit: Record<string, unknown> = {}
    try { audit = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate brand audit' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'brand_audit_run',
      action_data: { startupName, overallScore: audit.overallScore },
    }).maybeSingle()

    return NextResponse.json({ audit })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
