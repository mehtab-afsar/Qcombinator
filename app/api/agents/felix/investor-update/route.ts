import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/agents/felix/investor-update
// Body: { recipients, metricsSnapshot, subject? }

interface MetricsSnapshot {
  mrr?: string
  arr?: string
  growth?: string
  runway?: string
  topWin?: string
  topChallenge?: string
  ask?: string
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildInvestorUpdateHtml(
  startupName: string,
  founderName: string,
  metrics: MetricsSnapshot,
  subject: string
): string {
  const now = new Date()
  const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const safeName    = escHtml(startupName)
  const safeFounder = escHtml(founderName)
  const safeSubject = escHtml(subject)

  const row = (label: string, value: string | undefined) =>
    value
      ? `<tr>
          <td style="padding:8px 16px 8px 0;font-size:13px;color:#6B7280;white-space:nowrap;vertical-align:top;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${label}</td>
          <td style="padding:8px 0;font-size:15px;color:#111827;vertical-align:top">${escHtml(value)}</td>
        </tr>`
      : ''

  const section = (title: string, content: string | undefined) =>
    content
      ? `<tr>
          <td style="padding:24px 0 0">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280">${title}</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#111827">${escHtml(content)}</p>
          </td>
        </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;padding:40px 0">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:28px 40px">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#9CA3AF">Investor Update</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;color:#FFFFFF;letter-spacing:-0.02em">${safeName}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#9CA3AF">${monthYear} · From ${safeFounder}</p>
            </td>
          </tr>

          <!-- Metrics -->
          <tr>
            <td style="padding:32px 40px 0">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280">Metrics</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E7EB">
                ${row('MRR', metrics.mrr)}
                ${row('ARR', metrics.arr)}
                ${row('Growth', metrics.growth)}
                ${row('Runway', metrics.runway)}
              </table>
            </td>
          </tr>

          <!-- Win / Challenge / Ask -->
          <tr>
            <td style="padding:0 40px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${section('Top Win', metrics.topWin)}
                ${section('Top Challenge', metrics.topChallenge)}
                ${section('The Ask', metrics.ask)}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px 40px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E7EB">
                <tr>
                  <td style="padding-top:20px">
                    <p style="margin:0;font-size:13px;color:#6B7280">Sent via <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a> · Felix Finance Agent</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      recipients,
      metricsSnapshot,
      subject: customSubject,
    } = body as {
      recipients: string[]
      metricsSnapshot: MetricsSnapshot
      subject?: string
    }

    if (!recipients?.length) {
      return NextResponse.json({ error: 'recipients is required' }, { status: 400 })
    }
    if (!metricsSnapshot) {
      return NextResponse.json({ error: 'metricsSnapshot is required' }, { status: 400 })
    }

    // Fetch founder profile
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const startupName = profile?.startup_name ?? 'Our Startup'
    const founderName = profile?.full_name ?? 'The Founder'

    const now = new Date()
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const subject = customSubject ?? `${startupName} — Investor Update ${monthYear}`

    const bodyHtml = buildInvestorUpdateHtml(startupName, founderName, metricsSnapshot, subject)

    // Send via Resend using direct fetch
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email sending not configured' }, { status: 503 })
    }

    let sentCount = 0
    for (const recipient of recipients) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Edge Alpha <noreply@edgealpha.ai>',
            to: recipient,
            subject,
            html: bodyHtml,
          }),
        })
        if (res.ok) sentCount++
        else {
          const errText = await res.text()
          console.error(`Resend error for ${recipient}:`, errText)
        }
      } catch (err) {
        console.error(`Failed to send to ${recipient}:`, err)
      }
    }

    // Insert into investor_updates table
    await supabase.from('investor_updates').insert({
      user_id: user.id,
      subject,
      body_html: bodyHtml,
      metrics_snapshot: metricsSnapshot,
      recipients,
      sent_at: new Date().toISOString(),
    })

    // Log to agent_activity
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'felix',
      action_type: 'send_investor_update',
      description: `Sent investor update to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`,
      metadata: { sentCount, recipients, subject },
    })

    return NextResponse.json({ success: true, sentCount })
  } catch (err) {
    console.error('Felix investor-update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
