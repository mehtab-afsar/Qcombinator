import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/cohort
// Segments survey respondents into cohorts and analyzes NPS/sentiment differences.
// Body: { surveyId?, manualResponses? }
// Returns: { cohorts, insights, bestCohort, worstCohort, actionableFindings }

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
    const { surveyId, manualResponses } = body as { surveyId?: string; manualResponses?: string }

    const admin = getAdmin()

    // Fetch survey responses if surveyId provided
    const { data: surveyResponses } = surveyId
      ? await admin.from('survey_responses').select('response_data, submitted_at').eq('survey_id', surveyId).order('submitted_at', { ascending: true }).limit(100)
      : { data: null }

    const responses = surveyResponses ?? []

    // Build cohort data by submission week
    const weekMap: Record<string, { responses: Record<string, unknown>[]; npsScores: number[] }> = {}

    for (const r of responses) {
      const date = new Date(r.submitted_at)
      // Week number within the month (1-4)
      const week = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-W${Math.ceil(date.getDate() / 7)}`
      if (!weekMap[week]) weekMap[week] = { responses: [], npsScores: [] }
      const rdata = (r.response_data as Record<string, unknown>) ?? {}
      weekMap[week].responses.push(rdata)

      // Extract NPS if present
      const npsVal = rdata['nps'] ?? rdata['NPS'] ?? rdata['recommend'] ?? rdata['score']
      if (typeof npsVal === 'number') weekMap[week].npsScores.push(npsVal)
      else if (typeof npsVal === 'string' && !isNaN(parseInt(npsVal))) weekMap[week].npsScores.push(parseInt(npsVal))
    }

    const cohortSummaries = Object.entries(weekMap).map(([week, data]) => ({
      week,
      count: data.responses.length,
      avgNPS: data.npsScores.length > 0
        ? Math.round(data.npsScores.reduce((a, b) => a + b, 0) / data.npsScores.length)
        : null,
    }))

    // Sample some open text for context
    const openTexts = responses
      .flatMap(r => Object.values((r.response_data as Record<string, unknown>) ?? {}).filter(v => typeof v === 'string' && v.length > 20) as string[])
      .slice(0, 20)

    const contextParts = [
      responses.length > 0 ? `Total survey responses: ${responses.length}` : '',
      cohortSummaries.length > 0
        ? `Cohort data by week:\n${cohortSummaries.map(c => `${c.week}: ${c.count} responses, avg NPS: ${c.avgNPS ?? 'n/a'}`).join('\n')}`
        : '',
      openTexts.length > 0
        ? `\nSample open text responses:\n${openTexts.slice(0, 10).map((t, i) => `${i + 1}. "${t.slice(0, 200)}"`).join('\n')}`
        : '',
      manualResponses ? `\nManual cohort data provided:\n${manualResponses}` : '',
    ].filter(Boolean).join('\n')

    if (!contextParts.trim()) {
      return NextResponse.json({ error: 'No response data available. Complete a survey first or paste cohort data.' }, { status: 400 })
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Nova, a PMF advisor. Analyze customer cohort data and identify which segments have the highest and lowest satisfaction.

Return ONLY valid JSON:
{
  "cohorts": [
    {
      "name": "cohort name (e.g. 'Early January signups' or 'Power users')",
      "size": "number or 'unknown'",
      "nps": "number or null",
      "sentiment": "strong | positive | neutral | negative | mixed",
      "keyCharacteristics": ["what makes this cohort distinct"],
      "retentionSignal": "what suggests they'll stay or leave"
    }
  ],
  "bestCohort": {
    "description": "which cohort is happiest and why",
    "whatWorksForThem": "what's driving their satisfaction",
    "howToGetMore": "how to acquire more customers like them"
  },
  "worstCohort": {
    "description": "which cohort is least satisfied",
    "rootCause": "why they're struggling",
    "intervention": "what to do to rescue them or decide to let them churn"
  },
  "cohortTrend": "improving | stable | declining | insufficient_data",
  "actionableFindings": [
    { "finding": "specific insight", "action": "what to do about it", "priority": "high | medium | low" }
  ],
  "productInsight": "the single most important product decision this cohort data suggests",
  "bestFitProfile": "description of the customer profile that consistently shows highest satisfaction"
}`,
        },
        {
          role: 'user',
          content: `Analyze cohort data:\n${contextParts}`,
        },
      ],
      { maxTokens: 800, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await supabase.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'nova',
      action_type: 'cohort_analysis',
      description: `Cohort analysis — ${responses.length} responses, ${cohortSummaries.length} time cohorts`,
      metadata:    { responseCount: responses.length, cohortCount: cohortSummaries.length, trend: result.cohortTrend },
    }).then(() => {})

    return NextResponse.json({ result, cohortSummaries, responseCount: responses.length })
  } catch (err) {
    console.error('Nova cohort POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
