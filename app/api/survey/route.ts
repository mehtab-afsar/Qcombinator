import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET  /api/survey?surveyId=xxx — public, returns survey artifact content
// POST /api/survey            — public, submits a survey response

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const surveyId = url.searchParams.get('surveyId')

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId is required' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    const { data, error } = await adminClient
      .from('agent_artifacts')
      .select('id, content, title')
      .eq('id', surveyId)
      .eq('artifact_type', 'pmf_survey')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({
      survey: {
        id: data.id,
        content: data.content,
        title: data.title,
      },
    })
  } catch (err) {
    console.error('Survey GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      surveyId,
      userId,
      respondentEmail,
      answers,
    } = body as {
      surveyId: string
      userId: string
      respondentEmail?: string
      answers: Record<string, unknown>
    }

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId is required' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'answers is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS — respondent is not authenticated
    const adminClient = getAdminClient()

    const { error } = await adminClient.from('survey_responses').insert({
      survey_id: surveyId,
      user_id: userId,
      respondent_email: respondentEmail ?? null,
      answers,
      submitted_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Survey response insert error:', error)
      return NextResponse.json({ error: 'Failed to submit survey response' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Survey POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
