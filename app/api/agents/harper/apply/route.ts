import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/apply — public, submit a job application
// GET  /api/agents/harper/apply — authenticated founder only, view applications

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function scoreResumeWithLLM(
  roleDescription: string,
  resumeText: string
): Promise<{ score: number; notes: string }> {
  const rawContent = await callOpenRouter(
    [
      {
        role: 'system',
        content:
          'You are a hiring expert. Score this resume 0-100 for the role. Return JSON: { "score": number, "notes": "string (3 sentences max)" }',
      },
      {
        role: 'user',
        content: `Role: ${roleDescription}\n\nResume:\n${resumeText}`,
      },
    ],
    { maxTokens: 300, temperature: 0.3 },
  )

  // Strip potential markdown fences
  const cleanJson = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: { score?: unknown; notes?: unknown }
  try {
    parsed = JSON.parse(cleanJson)
  } catch {
    const match = cleanJson.match(/\{[\s\S]*\}/)
    try { parsed = match ? JSON.parse(match[0]) : {} } catch { parsed = {} }
  }
  return {
    score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      roleSlug,
      applicantName,
      applicantEmail,
      resumeText,
    } = body as {
      userId: string
      roleSlug: string
      applicantName: string
      applicantEmail: string
      resumeText: string
    }

    if (!userId || !roleSlug || !applicantName || !applicantEmail || !resumeText) {
      return NextResponse.json(
        { error: 'userId, roleSlug, applicantName, applicantEmail, and resumeText are required' },
        { status: 400 }
      )
    }

    const adminClient = getAdminClient()

    // Get the hiring_plan artifact for this user to fetch role details
    const { data: hiringArtifact } = await adminClient
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', userId)
      .eq('agent_id', 'harper')
      .eq('artifact_type', 'hiring_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Try to extract role title and description from the hiring plan content
    let roleTitle = roleSlug
    let roleDescription = `Role: ${roleSlug}`

    if (hiringArtifact?.content) {
      const content = hiringArtifact.content as Record<string, unknown>

      // The hiring plan might store roles as an array or object
      const roles = (content.roles ?? content.positions ?? []) as Array<Record<string, unknown>>
      const matchedRole = roles.find(
        (r) =>
          String(r.slug ?? r.id ?? '').toLowerCase() === roleSlug.toLowerCase() ||
          String(r.title ?? '').toLowerCase().replace(/\s+/g, '-') === roleSlug.toLowerCase()
      )

      if (matchedRole) {
        roleTitle = String(matchedRole.title ?? roleSlug)
        roleDescription = [
          `Title: ${matchedRole.title ?? roleSlug}`,
          matchedRole.description ? `Description: ${matchedRole.description}` : '',
          matchedRole.requirements ? `Requirements: ${JSON.stringify(matchedRole.requirements)}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      } else if (content.title) {
        roleTitle = String(content.title)
        roleDescription = `Title: ${content.title}\n${JSON.stringify(content).slice(0, 800)}`
      }
    }

    // Score the resume with OpenRouter
    let score = 0
    let scoreNotes = ''
    try {
      const result = await scoreResumeWithLLM(roleDescription, resumeText)
      score = result.score
      scoreNotes = result.notes
    } catch (err) {
      console.error('Resume scoring failed:', err)
      // Non-fatal — insert with score 0
    }

    // Insert into applications table
    const { data: application, error: insertError } = await adminClient
      .from('applications')
      .insert({
        user_id: userId,
        role_slug: roleSlug,
        role_title: roleTitle,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        resume_text: resumeText,
        score,
        score_notes: scoreNotes,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Application insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
    }

    // Log to agent_activity
    await adminClient.from('agent_activity').insert({
      user_id: userId,
      agent_id: 'harper',
      action_type: 'new_application',
      description: `New application from ${applicantName} for ${roleSlug} — score: ${score}/100`,
      metadata: {
        application_id: application?.id ?? null,
        role_slug: roleSlug,
        role_title: roleTitle,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        score,
      },
    })

    return NextResponse.json({ success: true, score, notes: scoreNotes })
  } catch (err) {
    console.error('Harper apply POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()

    const { data, error } = await adminClient
      .from('applications')
      .select(
        'id, role_slug, role_title, applicant_name, applicant_email, score, score_notes, created_at'
      )
      .eq('user_id', user.id)
      .order('score', { ascending: false })

    if (error) {
      console.error('Applications fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({ applications: data ?? [] })
  } catch (err) {
    console.error('Harper apply GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
