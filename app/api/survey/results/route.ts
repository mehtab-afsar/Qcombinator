import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET /api/survey/results?surveyId=xxx — authenticated founder
// Returns all responses for the survey, plus PMF score calculation

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const surveyId = url.searchParams.get('surveyId')

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the artifact belongs to this user
    const { data: artifact, error: artifactError } = await adminClient
      .from('agent_artifacts')
      .select('id, user_id')
      .eq('id', surveyId)
      .eq('user_id', user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Survey not found or access denied' }, { status: 404 })
    }

    // Fetch all survey responses for this survey belonging to this founder
    const { data: responses, error: responsesError } = await adminClient
      .from('survey_responses')
      .select('id, survey_id, user_id, respondent_email, answers, submitted_at')
      .eq('survey_id', surveyId)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })

    if (responsesError) {
      console.error('Survey results fetch error:', responsesError)
      return NextResponse.json({ error: 'Failed to fetch survey responses' }, { status: 500 })
    }

    const total = responses?.length ?? 0
    const allResponses = responses ?? []

    // Disappointment distribution (Sean Ellis test)
    const DISAPPOINTMENT_KEYS = ['very_disappointed', 'somewhat_disappointed', 'not_disappointed']
    const dist: Record<string, number> = { very_disappointed: 0, somewhat_disappointed: 0, not_disappointed: 0 }
    for (const r of allResponses) {
      const ans = r.answers as Record<string, unknown>
      const val = String(
        ans?.disappointment ?? ans?.ellis ?? ans?.how_disappointed ?? ''
      ).toLowerCase().replace(/\s+/g, '_')
      if (DISAPPOINTMENT_KEYS.includes(val)) dist[val]++
    }

    const pmfScore = total > 0 ? Math.round((dist.very_disappointed / total) * 100) : 0

    // Build per-question frequency tables for all radio questions
    const questionFreq: Record<string, Record<string, number>> = {}
    for (const r of allResponses) {
      const ans = r.answers as Record<string, string>
      for (const [qid, val] of Object.entries(ans)) {
        if (qid === 'disappointment' || qid === 'ellis') continue
        if (typeof val !== 'string') continue
        if (!questionFreq[qid]) questionFreq[qid] = {}
        questionFreq[qid][val] = (questionFreq[qid][val] ?? 0) + 1
      }
    }

    // Collect free-text answers (main_benefit, alternatives, improvements etc.)
    const textAnswers: { qid: string; text: string }[] = []
    for (const r of allResponses) {
      const ans = r.answers as Record<string, string>
      for (const [qid, val] of Object.entries(ans)) {
        if (typeof val === 'string' && val.length > 10 && !DISAPPOINTMENT_KEYS.includes(val)) {
          textAnswers.push({ qid, text: val })
        }
      }
    }

    return NextResponse.json({
      responses: allResponses.slice(0, 50), // cap at 50 for payload size
      total,
      pmfScore,
      threshold: 40,
      distribution: {
        very_disappointed:       dist.very_disappointed,
        somewhat_disappointed:   dist.somewhat_disappointed,
        not_disappointed:        dist.not_disappointed,
      },
      questionFreq,
      textAnswers: textAnswers.slice(0, 30),
    })
  } catch (err) {
    console.error('Survey results GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
