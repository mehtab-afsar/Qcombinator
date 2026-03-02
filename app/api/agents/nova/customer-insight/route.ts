import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/customer-insight
// No body — pulls pmf_survey artifact + interview notes for pattern synthesis
// Returns: { report: { topThemes[], painPoints[], delightMoments[], churnRisks[],
//   retentionDrivers[], productGaps[], verbatims[], segmentInsights[], recommendations[] } }

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

    const [{ data: pmfArts }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova')
        .eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(2),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const pmfArt = { data: pmfArts?.[0] ?? null }
    const interviewArt = { data: pmfArts?.[1] ?? null }

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry  = profileData?.industry  as string ?? 'B2B SaaS'
    const description = profileData?.description as string ?? ''

    const pmf   = pmfArt?.data?.content     as Record<string, unknown> | null
    const interview = interviewArt?.data?.content as Record<string, unknown> | null

    const pmfContext = pmf
      ? JSON.stringify({
          questions: (pmf.questions as unknown[] | undefined)?.slice(0, 5),
          score: pmf.overallPmfScore ?? pmf.pmfScore,
        })
      : 'No PMF survey data yet'

    const interviewContext = interview
      ? JSON.stringify({
          questions: (interview.questions as unknown[] | undefined)?.slice(0, 5),
        })
      : 'No interview data yet'

    const prompt = `You are Nova, a customer research expert. Synthesize customer insights for ${startupName}.

COMPANY: ${startupName} — ${description || industry}
PMF SURVEY DATA: ${pmfContext}
INTERVIEW DATA: ${interviewContext}

Identify patterns, themes, and actionable insights from the customer research. Even with limited data, provide a structured analysis with clear recommendations.

Return JSON only (no markdown):
{
  "topThemes": [
    { "theme": "theme name", "frequency": "high / medium / low", "summary": "what customers keep saying about this" }
  ],
  "painPoints": [
    { "pain": "specific pain point", "severity": "critical / moderate / minor", "quote": "example customer language" }
  ],
  "delightMoments": ["what customers love most 1", "what customers love most 2"],
  "churnRisks": ["risk factor that could drive churn 1", "risk factor 2"],
  "retentionDrivers": ["what keeps customers 1", "driver 2", "driver 3"],
  "productGaps": ["missing feature or capability customers want 1", "gap 2", "gap 3"],
  "verbatims": ["memorable customer quote 1", "quote 2", "quote 3"],
  "segmentInsights": [
    { "segment": "segment name (e.g. power users, churned)", "insight": "key insight about this segment", "implication": "what to do" }
  ],
  "recommendations": [
    { "action": "specific recommendation", "impact": "high / medium / low", "effort": "low / medium / high", "rationale": "why" }
  ],
  "synthesisNote": "1 sentence summary of the most important thing this research reveals"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let report: Record<string, unknown> = {}
    try { report = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate customer insight report' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'nova', action_type: 'customer_insight_generated',
      action_data: { startupName, themeCount: (report.topThemes as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ report })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
