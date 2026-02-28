import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/brand-check
// Checks a piece of copy (website, email, deck) for brand consistency.
// Body: { copy: string, contentType?: 'website' | 'email' | 'deck' | 'social' | 'general' }
// Returns: { result: { overallScore, grade, dimensions[{ name, score, status, feedback }], topIssues[], topStrengths[], revisedOpening } }

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
    const { copy, contentType } = body as {
      copy: string
      contentType?: 'website' | 'email' | 'deck' | 'social' | 'general'
    }

    if (!copy?.trim()) {
      return NextResponse.json({ error: 'Copy text is required' }, { status: 400 })
    }
    if (copy.length > 5000) {
      return NextResponse.json({ error: 'Copy text too long (max 5000 characters)' }, { status: 400 })
    }

    const admin = getAdmin()

    const [
      { data: fp },
      { data: brandArtifact },
      { data: gtmArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya').eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel').eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const brand = (brandArtifact?.content ?? {}) as Record<string, unknown>
    const gtm   = (gtmArtifact?.content ?? {}) as Record<string, unknown>
    const sp    = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    const brandContext = brandArtifact
      ? [
          brand.brandVoice ? `Brand voice: ${brand.brandVoice}` : '',
          brand.tagline ? `Tagline: ${brand.tagline}` : '',
          brand.valueProposition ? `Value prop: ${brand.valueProposition}` : '',
          brand.toneAttributes && Array.isArray(brand.toneAttributes)
            ? `Tone: ${(brand.toneAttributes as string[]).join(', ')}`
            : '',
          brand.wordsToAvoid && Array.isArray(brand.wordsToAvoid)
            ? `Words to avoid: ${(brand.wordsToAvoid as string[]).join(', ')}`
            : '',
          gtm.positioningStatement ? `Positioning: ${gtm.positioningStatement}` : '',
        ].filter(Boolean).join('\n')
      : [
          sp.solution ? `What we do: ${sp.solution}` : '',
          sp.problem ? `Problem we solve: ${sp.problem}` : '',
        ].filter(Boolean).join('\n') || 'No brand guidelines — evaluate against startup communication best practices'

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Maya, a brand strategist. Review this ${contentType ?? 'copy'} for brand consistency, tone, and quality. Be direct and specific.

${brandArtifact ? 'Brand guidelines provided — score against them.' : 'No guidelines — evaluate against startup communication best practices.'}

Return ONLY valid JSON:
{
  "overallScore": 0-100,
  "grade": "A | B | C | D | F",
  "dimensions": [
    {
      "name": "dimension name (Tone, Clarity, Specificity, Brand Alignment, Value Clarity)",
      "score": 0-100,
      "status": "strong | needs work | weak",
      "feedback": "specific, actionable 1-sentence feedback"
    }
  ],
  "topIssues": ["3-4 specific problems to fix — quote from the copy when possible"],
  "topStrengths": ["2-3 things that are working well"],
  "revisedOpening": "rewritten opening line or hook (if it needs improvement, otherwise null)"
}

Score on exactly 5 dimensions. Focus on: clarity, specificity, tone, brand alignment, value clarity.`,
        },
        {
          role: 'user',
          content: `Check this ${contentType ?? 'copy'}:\n\n---\n${copy}\n---\n\nBrand context:\n${brandContext}`,
        },
      ],
      { maxTokens: 800, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'maya',
      action_type: 'brand_check_completed',
      description: `Brand check — score: ${String(result.overallScore ?? '?')}/100 (${String(result.grade ?? '?')}), ${String((result.topIssues as unknown[] | undefined)?.length ?? 0)} issues`,
      metadata:    { overallScore: result.overallScore, grade: result.grade, contentType },
    }).then(() => {})

    return NextResponse.json({ result })
  } catch (err) {
    console.error('Maya brand-check POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
