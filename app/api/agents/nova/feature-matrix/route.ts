import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/feature-matrix
// No body — pulls pmf_survey + customer_insight artifacts for context
// Returns: { matrix: { features[], prioritization: 'kano'|'rice'|'moscow', legend } }

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

    const [{ data: pmfArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const description = profileData?.description as string ?? ''

    const pmf = pmfArt?.content as Record<string, unknown> | null
    const pmfCtx = pmf
      ? `PMF score: ${pmf.overallPmfScore ?? pmf.pmfScore ?? 'unknown'}`
      : 'No PMF data'

    const prompt = `You are Nova, a product strategist. Build a prioritized feature matrix for ${startupName}.

COMPANY: ${startupName} — ${description || industry}
${pmfCtx}

Generate 12 features using the RICE scoring framework (Reach, Impact, Confidence, Effort). Include a mix of quick wins, big bets, and maintenance items.

Return JSON only (no markdown):
{
  "features": [
    {
      "feature": "feature name",
      "description": "1 sentence on what it does and who it's for",
      "category": "acquisition / retention / monetization / infrastructure / delight",
      "reach": 1000,
      "reachNote": "how many users/month this affects",
      "impact": 3,
      "impactNote": "1=minimal, 2=low, 3=medium, 4=high, 5=massive",
      "confidence": 80,
      "confidenceNote": "% confident in estimates",
      "effort": 4,
      "effortNote": "person-weeks of work",
      "riceScore": 600,
      "moscoWCategory": "must have / should have / could have / won't have",
      "kanoCategory": "basic / performance / delight",
      "customerEvidence": "quote or signal from customers supporting this",
      "risks": "main risk of building this",
      "tag": "quick win / big bet / table stakes / nice to have"
    }
  ],
  "topPriorities": ["feature name 1", "feature name 2", "feature name 3"],
  "quickWins": ["feature that's high RICE and low effort 1", "quick win 2"],
  "recommendation": "2-sentence strategic recommendation on where to focus next quarter"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let matrix: Record<string, unknown> = {}
    try { matrix = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate feature matrix' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'feature_matrix_generated',
      action_data: { startupName, featureCount: (matrix.features as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ matrix })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
