import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// POST /api/agents/nova/distribute
// Distributes a PMF survey to a list of customer emails via Resend.
// Body: { surveyId, emails: string[], subject?, customMessage? }
// Returns: { sent, failed, surveyUrl }

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
    const { surveyId, emails, subject, customMessage } = body as {
      surveyId?: string
      emails?: string[]
      subject?: string
      customMessage?: string
    }

    const validEmails = (emails ?? []).filter(e => typeof e === 'string' && e.includes('@') && e.includes('.'))
    if (validEmails.length === 0) {
      return NextResponse.json({ error: 'At least one valid email address is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Get or find latest survey
    let targetSurveyId = surveyId
    if (!targetSurveyId) {
      const { data: latestSurvey } = await admin
        .from('deployed_sites')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'survey')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetSurveyId = latestSurvey?.id
    }

    // Get founder name for email
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('full_name, startup_name')
      .eq('user_id', user.id)
      .single()

    const founderName = fp?.full_name ?? 'The Founder'
    const startupName = fp?.startup_name ?? 'our company'
    const surveyUrl = targetSurveyId
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.edgealpha.co'}/s/${targetSurveyId}`
      : null

    if (!surveyUrl) {
      return NextResponse.json({ error: 'No survey found. Generate a PMF survey first.' }, { status: 400 })
    }

    const emailSubject = subject?.trim() || `Quick question from ${founderName} — 2 minutes max`

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 16px; color: #18160F; background: #FFFFFF;">
  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">Hi,</p>
  ${customMessage ? `<p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">${customMessage}</p>` : `
  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
    I'm ${founderName}, one of the founders at ${startupName}. You're one of our earliest users, and your opinion genuinely shapes what we build next.
  </p>
  <p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
    I'd love 2 minutes of your time to answer a few questions. No account needed, no fluff — just honest feedback that helps us build something you actually want.
  </p>
  `}
  <div style="text-align: center; margin: 32px 0;">
    <a href="${surveyUrl}" style="display: inline-block; padding: 14px 32px; background: #2563EB; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 700;">
      Take the 2-minute survey →
    </a>
  </div>
  <p style="font-size: 14px; color: #8A867C; line-height: 1.6; margin: 0 0 16px;">
    Or copy this link: <a href="${surveyUrl}" style="color: #2563EB;">${surveyUrl}</a>
  </p>
  <p style="font-size: 15px; line-height: 1.7; margin: 32px 0 0;">
    Thank you — every response matters a lot.
  </p>
  <p style="font-size: 15px; line-height: 1.7; margin: 4px 0 0;">${founderName}</p>
  <p style="font-size: 13px; color: #8A867C; margin: 4px 0 0;">${startupName}</p>
  <p style="font-size: 11px; color: #8A867C; margin: 32px 0 0; border-top: 1px solid #E2DDD5; padding-top: 16px;">You're receiving this because you've used ${startupName}. This is a one-time message.</p>
</body>
</html>`

    if (!process.env.RESEND_API_KEY) {
      // Simulate send in dev
      await admin.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'nova',
        action_type: 'survey_distributed',
        description: `Survey distribution simulated to ${validEmails.length} recipients (no Resend key)`,
        metadata:    { surveyId: targetSurveyId, recipientCount: validEmails.length, surveyUrl },
      }).then(() => {})
      return NextResponse.json({ sent: validEmails.length, failed: 0, surveyUrl, simulated: true })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send in batches of 10 to stay within rate limits
    const BATCH_SIZE = 10
    let sent = 0
    let failed = 0

    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const batch = validEmails.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(email =>
          resend.emails.send({
            from: `${founderName} <noreply@edgealpha.co>`,
            to: email,
            subject: emailSubject,
            html: htmlBody,
          })
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') sent++
        else failed++
      }
    }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'nova',
      action_type: 'survey_distributed',
      description: `PMF survey distributed to ${sent} recipients (${failed} failed)`,
      metadata:    { surveyId: targetSurveyId, sent, failed, surveyUrl },
    }).then(() => {})

    return NextResponse.json({ sent, failed, surveyUrl })
  } catch (err) {
    console.error('Nova distribute POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
