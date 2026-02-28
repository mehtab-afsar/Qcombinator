import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/churn
// Analyzes churn prediction signals from survey data, Stripe metrics, and usage patterns.
// Body: { manualData?: string, surveyId?: string, stripeMRR?: number, stripeChurnRate?: number }
// Returns: { atRiskSegments, churnPredictors, savePlaybook, immediateActions, churnScore }

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
    const { manualData, surveyId, stripeMRR, stripeChurnRate } = body as {
      manualData?: string
      surveyId?: string
      stripeMRR?: number
      stripeChurnRate?: number
    }

    const admin = getAdmin()

    // Gather data signals
    const [
      { data: surveyResponses },
      { data: financialArtifact },
      { data: pmfArtifact },
    ] = await Promise.all([
      surveyId
        ? admin.from('survey_responses').select('response_data, submitted_at').eq('survey_id', surveyId).order('submitted_at', { ascending: false }).limit(50)
        : Promise.resolve({ data: null }),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova').eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    // Extract financial signals
    const financialContent = (financialArtifact?.content ?? {}) as Record<string, unknown>
    const churnRate = stripeChurnRate ?? (financialContent.churnRate as number | undefined)
    const mrr = stripeMRR ?? (parseFloat(String(financialContent.mrr ?? '0').replace(/[^0-9.]/g, '')) || 0)
    const runway = financialContent.runway as string | undefined

    // Extract PMF signals from survey
    const pmfContent = (pmfArtifact?.content ?? {}) as Record<string, unknown>
    const nps = pmfContent.nps as number | undefined

    // Pull representative survey open-text responses for analysis
    const responses = surveyResponses ?? []
    const openTexts = responses
      .flatMap(r => {
        const data = r.response_data as Record<string, unknown> | null
        if (!data) return []
        return Object.values(data).filter(v => typeof v === 'string' && v.length > 20) as string[]
      })
      .slice(0, 20)

    // Build churn signal context
    const signals: string[] = []
    if (churnRate !== undefined && churnRate > 5) signals.push(`High churn rate: ${churnRate}%/month`)
    if (nps !== undefined && nps < 30) signals.push(`Low NPS: ${nps} (below 30 is danger zone)`)
    if (mrr > 0 && churnRate && mrr * (churnRate / 100) > mrr * 0.1) signals.push(`Monthly churn revenue > 10% of MRR`)
    if (runway && parseInt(runway) < 6) signals.push(`Runway < 6 months: ${runway}`)

    const contextParts = [
      mrr > 0      ? `Current MRR: $${mrr.toLocaleString()}` : '',
      churnRate    ? `Monthly churn rate: ${churnRate}%` : '',
      nps !== undefined ? `NPS: ${nps}` : '',
      runway       ? `Runway: ${runway}` : '',
      signals.length > 0 ? `Churn signals detected: ${signals.join('; ')}` : '',
      openTexts.length > 0 ? `\nSurvey open responses (sample):\n${openTexts.slice(0, 8).map((t, i) => `${i + 1}. "${t.slice(0, 200)}"`).join('\n')}` : '',
      manualData   ? `\nAdditional context:\n${manualData}` : '',
    ].filter(Boolean).join('\n')

    if (!contextParts.trim()) {
      return NextResponse.json({
        error: 'No data provided. Connect Stripe or paste customer feedback to analyze churn signals.',
      }, { status: 400 })
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Nova, a PMF and growth advisor. Analyze churn prediction signals and generate a save playbook.
Return ONLY valid JSON:
{
  "churnScore": 0-100,
  "riskLevel": "low | medium | high | critical",
  "atRiskSegments": [
    { "segment": "description of at-risk customer type", "signal": "what's making them churn", "size": "estimated % of base" }
  ],
  "churnPredictors": [
    { "predictor": "specific churn predictor", "severity": "high | medium | low", "evidence": "what data shows this" }
  ],
  "savePlaybook": [
    { "action": "specific action", "timing": "immediate | this_week | this_month", "target": "who to target", "expectedImpact": "churn reduction" }
  ],
  "immediateActions": ["3 things to do today to reduce churn risk"],
  "earlyWarningMetrics": ["2-3 leading indicators to monitor weekly"],
  "retentionInsight": "1 key insight about what keeps your best customers"
}
Rules:
- Base on actual signals provided, don't make up data
- If NPS < 40, onboarding and activation are usually the culprit
- If churn > 5%/month, pricing or value delivery is misaligned
- Be specific about which customer segments are at risk`,
        },
        {
          role: 'user',
          content: `Analyze churn signals:\n${contextParts}`,
        },
      ],
      { maxTokens: 700, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    await supabase.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'nova',
      action_type: 'churn_analysis',
      description: `Churn analysis — risk: ${String(analysis.riskLevel ?? 'unknown')}, score: ${String(analysis.churnScore ?? '?')}/100`,
      metadata:    { churnScore: analysis.churnScore, riskLevel: analysis.riskLevel, churnRate, nps },
    }).then(() => {})

    return NextResponse.json({ analysis, signals, mrr, churnRate, nps })
  } catch (err) {
    console.error('Nova churn POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
