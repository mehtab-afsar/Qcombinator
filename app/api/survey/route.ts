import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { log } from '@/lib/logger'

// GET  /api/survey?surveyId=xxx — public, returns survey artifact content
// POST /api/survey            — public, submits a survey response
//
// Security: userId is NEVER accepted from the request body.
// The founder's user_id is derived server-side from the survey artifact itself,
// preventing any caller from attributing responses to an arbitrary founder.

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const surveySubmitSchema = z.object({
  surveyId: z.string().uuid('surveyId must be a valid UUID'),
  respondentEmail: z.string().email().optional(),
  answers: z.record(z.string(), z.unknown()),
})

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
    log.error('Survey GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json()
    const parsed = surveySubmitSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const { surveyId, respondentEmail, answers } = parsed.data

    const adminClient = getAdminClient()

    // Resolve the founder's user_id from the survey artifact — never trust userId from the body.
    const { data: artifact, error: artifactError } = await adminClient
      .from('agent_artifacts')
      .select('user_id')
      .eq('id', surveyId)
      .eq('artifact_type', 'pmf_survey')
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const { error } = await adminClient.from('survey_responses').insert({
      survey_id: surveyId,
      user_id: artifact.user_id,   // authoritative — from the DB, not the caller
      respondent_email: respondentEmail ?? null,
      answers,
      submitted_at: new Date().toISOString(),
    })

    if (error) {
      log.error('Survey response insert error:', error)
      return NextResponse.json({ error: 'Failed to submit survey response' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('Survey POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
