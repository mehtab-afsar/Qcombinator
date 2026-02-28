import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/features
// Aggregates feature requests from survey open-text responses.
// Clusters into themes, ranks by frequency, maps to roadmap categories.
// Body: { surveyId?, manualFeedback? } — either surveyId (pulls from DB) or raw feedback text

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
    const { surveyId, manualFeedback } = body as { surveyId?: string; manualFeedback?: string }

    if (!surveyId && !manualFeedback?.trim()) {
      return NextResponse.json({ error: 'surveyId or manualFeedback is required' }, { status: 400 })
    }

    const admin = getAdmin()
    let feedbackLines: string[] = []

    if (surveyId) {
      // Pull from survey responses
      const { data: responses } = await admin
        .from('survey_responses')
        .select('answers, created_at')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false })
        .limit(100)

      feedbackLines = (responses ?? []).flatMap(r => {
        const a = r.answers as Record<string, string>
        return Object.values(a).filter(v => typeof v === 'string' && v.length > 15)
      })
    } else if (manualFeedback) {
      feedbackLines = manualFeedback.split('\n').map(l => l.trim()).filter(l => l.length > 10)
    }

    if (feedbackLines.length === 0) {
      return NextResponse.json({ error: 'No feedback found to analyze' }, { status: 404 })
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Nova, a PMF research analyst. Analyze user feedback to extract and cluster feature requests.
Return ONLY valid JSON:
{
  "clusters": [
    {
      "theme": "short theme name (2-4 words)",
      "category": "core_product | ux_improvement | integrations | reporting | pricing | support | other",
      "frequency": 3,
      "requests": ["specific feature requests quoted or paraphrased from feedback — max 4"],
      "effort": "low | medium | high",
      "impact": "low | medium | high",
      "riceScore": 42,
      "priority": "must_have | should_have | nice_to_have | later",
      "representativeQuote": "best verbatim quote supporting this theme — null if none"
    }
  ],
  "totalFeedbackItems": 23,
  "topInsight": "the single most important takeaway from this data",
  "quickWins": ["2-3 features that are low effort + high frequency"],
  "strategicBets": ["1-2 high impact features even if harder to build"]
}
Rules:
- RICE score = (Reach × Impact × Confidence) / Effort — estimate on 0-100 scale
- Identify 4-8 clusters (not too granular, not too broad)
- Quick wins = low effort, appears in 3+ pieces of feedback
- Sort clusters by RICE score descending`,
        },
        {
          role: 'user',
          content: `Analyze ${feedbackLines.length} pieces of user feedback for feature requests:\n\n${feedbackLines.slice(0, 50).map((f, i) => `${i + 1}. "${f}"`).join('\n')}`,
        },
      ],
      { maxTokens: 800, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'nova',
      action_type: 'feature_requests_aggregated',
      description: `Feature requests aggregated: ${(analysis.clusters as unknown[])?.length ?? 0} themes from ${feedbackLines.length} feedback items`,
      metadata: { surveyId: surveyId ?? null, feedbackCount: feedbackLines.length, clusterCount: (analysis.clusters as unknown[])?.length ?? 0 },
    }).then(() => {})

    return NextResponse.json({ analysis, feedbackCount: feedbackLines.length })
  } catch (err) {
    console.error('Nova features error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
