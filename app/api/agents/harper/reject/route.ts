import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'
import { Resend } from 'resend'

// POST /api/agents/harper/reject
// Generates a personalised, kind rejection email for a candidate and sends it via Resend.
// Also marks the application as rejected in the DB.

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const body = await request.json()
    const {
      applicationId,
      applicantName,
      applicantEmail,
      roleTitle,
      score,
      scoreNotes,
      companyName,
      founderName,
    } = body as {
      applicationId: string
      applicantName: string
      applicantEmail: string
      roleTitle: string
      score?: number
      scoreNotes?: string
      companyName?: string
      founderName?: string
    }

    if (!applicationId || !applicantName || !applicantEmail || !roleTitle) {
      return NextResponse.json({ error: 'applicationId, applicantName, applicantEmail, roleTitle are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Fetch founder profile for company name if not provided
    let company = companyName ?? 'the team'
    let founder = founderName ?? 'The Hiring Team'
    if (!companyName || !founderName) {
      const { data: fp } = await admin
        .from('founder_profiles')
        .select('startup_name, full_name')
        .eq('user_id', user.id)
        .single()
      company = company || (fp?.startup_name as string) || 'the team'
      founder = founder || (fp?.full_name as string) || 'The Hiring Team'
    }

    // LLM-generated rejection email
    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are a thoughtful hiring manager. Write a kind, specific, non-generic rejection email for a job applicant.
The email should be 3–4 short paragraphs: brief opening acknowledging their application, honest but constructive reason for not moving forward (without being specific about the score), warm closing with genuine encouragement.
DO NOT use phrases like "we have decided to move forward with other candidates" or "at this time" or "best of luck in your future endeavors" — they are clichéd.
Return ONLY the email body (no subject, no greeting line — we'll add those). Plain text, no markdown.`,
        },
        {
          role: 'user',
          content: `Applicant: ${applicantName}
Role: ${roleTitle} at ${company}
Resume score: ${score ?? 'not available'}/100
Score notes: ${scoreNotes || 'no specific notes'}
Founder/hiring manager name: ${founder}

Write the rejection email body.`,
        },
      ],
      { maxTokens: 400, temperature: 0.6 }
    )

    const body_text = raw.trim()

    // Build HTML email
    const paragraphs = body_text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p style="margin:0 0 14px;line-height:1.65;color:#18160F;font-size:14px">${escHtml(p)}</p>`)
      .join('')

    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;margin:0 auto;padding:40px 32px;color:#18160F">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#18160F">Hi ${escHtml(applicantName)},</p>
        ${paragraphs}
        <p style="margin:0;font-size:14px;color:#18160F;line-height:1.65">Warmly,<br/>${escHtml(founder)}<br/><span style="color:#8A867C;font-size:12px">${escHtml(company)}</span></p>
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E2DDD5">
          <p style="font-size:11px;color:#8A867C;margin:0">Sent via <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a></p>
        </div>
      </div>`

    const subject = `Your application to ${company} — ${roleTitle}`

    // Send via Resend
    const resend = new Resend(resendKey)
    const { error: sendError } = await resend.emails.send({
      from:    `${company} <no-reply@edgealpha.ai>`,
      to:      applicantEmail,
      subject,
      html:    htmlBody,
    })

    if (sendError) {
      return NextResponse.json({ error: 'Failed to send rejection email' }, { status: 500 })
    }

    // Mark application as rejected
    await admin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)
      .eq('user_id', user.id)

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'harper',
      action_type: 'rejection_sent',
      description: `Rejection email sent to ${applicantName} for ${roleTitle}`,
      metadata:    { applicationId, applicantEmail, roleTitle, score },
    })

    return NextResponse.json({ sent: true, subject })
  } catch (err) {
    console.error('Harper reject error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
