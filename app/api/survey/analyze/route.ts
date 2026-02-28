import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/survey/analyze
// Auto-analyzes NEW survey responses since a given timestamp.
// Body: { surveyId, since? } — since defaults to 24h ago

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
    const { surveyId, since } = body as { surveyId: string; since?: string }

    if (!surveyId) return NextResponse.json({ error: 'surveyId is required' }, { status: 400 })

    const admin = getAdmin()

    // Verify ownership
    const { data: artifact } = await admin
      .from('agent_artifacts')
      .select('id, user_id, content')
      .eq('id', surveyId)
      .eq('user_id', user.id)
      .single()

    if (!artifact) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

    const sinceTs = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Fetch all responses + new responses since timestamp
    const [{ data: allResponses }, { data: newResponses }] = await Promise.all([
      admin.from('survey_responses').select('answers, created_at').eq('survey_id', surveyId).order('created_at', { ascending: false }),
      admin.from('survey_responses').select('answers, created_at').eq('survey_id', surveyId).gte('created_at', sinceTs).order('created_at', { ascending: false }),
    ])

    const all = allResponses ?? []
    const newOnes = newResponses ?? []
    const totalCount = all.length
    const newCount = newOnes.length

    if (totalCount === 0) {
      return NextResponse.json({ totalCount: 0, newCount: 0, analysis: null })
    }

    // Calculate PMF score from all responses
    const ellisResponses = all.map(r => {
      const answers = r.answers as Record<string, string>
      return answers['pmf'] ?? answers['disappointment'] ?? answers['q0'] ?? ''
    }).filter(Boolean)

    const veryDisappointed = ellisResponses.filter(r =>
      r.toLowerCase().includes('very') || r === 'very_disappointed' || r === '3'
    ).length
    const pmfScore = ellisResponses.length > 0
      ? Math.round((veryDisappointed / ellisResponses.length) * 100)
      : 0

    // Extract text answers for themes
    const textAnswers = all.flatMap(r => {
      const answers = r.answers as Record<string, string>
      return Object.values(answers).filter(v => typeof v === 'string' && v.length > 15)
    }).slice(0, 40)

    // Only run LLM if we have new responses or enough data
    let analysis: Record<string, unknown> | null = null
    if (totalCount >= 3) {
      const raw = await callOpenRouter(
        [
          {
            role: 'system',
            content: `You are Nova, a PMF analyst. Analyze survey response data and return insights.
Return ONLY valid JSON:
{
  "pmfSignal": "strong (>=40%) | moderate (25-39%) | weak (<25%) | insufficient data",
  "pmfScore": 42,
  "trendNote": "1 sentence on direction — improving, stable, or declining",
  "topThemes": ["3-4 recurring themes from open text answers"],
  "topQuote": "most insightful verbatim quote from responses — null if none",
  "earlyAdopterSegment": "what type of user is most enthusiastic — null if unclear",
  "actionableInsight": "1 specific thing to do based on this data",
  "alerts": ["anything alarming in the data — empty array if nothing"]
}`,
          },
          {
            role: 'user',
            content: `Survey data:
Total responses: ${totalCount}
New responses (last 24h): ${newCount}
PMF (Very Disappointed %): ${pmfScore}%
Very disappointed count: ${veryDisappointed}/${ellisResponses.length} responses answered PMF question

Open text answers (sample):
${textAnswers.slice(0, 20).map((t, i) => `${i + 1}. "${t}"`).join('\n')}`,
          },
        ],
        { maxTokens: 600, temperature: 0.4 }
      )

      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      try { analysis = JSON.parse(clean) }
      catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : null } catch { analysis = null } }
    }

    // Log activity if new responses came in
    if (newCount > 0) {
      await admin.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'nova',
        action_type: 'survey_analyzed',
        description: `${newCount} new survey response${newCount !== 1 ? 's' : ''} analyzed — PMF score: ${pmfScore}%`,
        metadata: { surveyId, newCount, totalCount, pmfScore },
      })
    }

    return NextResponse.json({
      totalCount,
      newCount,
      pmfScore,
      veryDisappointed,
      analysis,
      since: sinceTs,
    })
  } catch (err) {
    console.error('Survey analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
