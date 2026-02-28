import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/agents/sage/investor-update
// Body: { contactIds: string[] }
// Sends a strategy-focused YC investor update to selected investor contacts

interface InvestorContact {
  id: string
  name: string
  email: string
  firm: string | null
}

function buildSageInvestorUpdateHtml(
  startupName: string,
  founderName: string,
  qscoreData: Record<string, unknown> | null,
  financialData: Record<string, unknown> | null,
  strategicData: Record<string, unknown> | null,
  subject: string
): string {
  const now = new Date()
  const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  // Extract qscore info
  const qscore = qscoreData?.overall_score ?? null
  const qscoreLabel = qscore !== null ? `${qscore}/100` : 'Not yet calculated'

  // Extract financial highlights
  const fin = financialData as Record<string, unknown> | null
  const finMetrics = (fin?.metrics as Record<string, unknown> | undefined) ?? null
  const mrr = fin?.mrr ?? finMetrics?.mrr ?? null
  const runway = fin?.runway ?? finMetrics?.runway ?? null
  const growth = fin?.growth ?? finMetrics?.growth ?? null

  // Extract strategic focus
  const strat = strategicData as Record<string, unknown> | null
  const focus = strat?.focus ?? strat?.strategic_focus ?? strat?.quarter_focus ?? null
  const okrs = strat?.okrs ?? strat?.objectives ?? null

  const metricRow = (label: string, value: unknown) =>
    value !== null && value !== undefined
      ? `<tr>
          <td style="padding:8px 16px 8px 0;font-size:13px;color:#6B7280;white-space:nowrap;vertical-align:top;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${label}</td>
          <td style="padding:8px 0;font-size:15px;color:#111827;vertical-align:top">${String(value)}</td>
        </tr>`
      : ''

  const okrSection =
    Array.isArray(okrs) && okrs.length > 0
      ? `<tr>
          <td style="padding:24px 0 0">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280">OKRs This Quarter</p>
            <ul style="margin:0;padding-left:20px">
              ${(okrs as Array<Record<string, unknown>>)
                .slice(0, 4)
                .map(
                  (o) =>
                    `<li style="font-size:15px;line-height:1.6;color:#111827;margin-bottom:6px">${String(o.objective ?? o.title ?? JSON.stringify(o))}</li>`
                )
                .join('')}
            </ul>
          </td>
        </tr>`
      : ''

  const focusSection = focus
    ? `<tr>
        <td style="padding:24px 0 0">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280">Strategic Focus</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#111827">${String(focus)}</p>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;padding:40px 0">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <!-- Header -->
          <tr>
            <td style="background:#1E3A5F;padding:28px 40px">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#93C5FD">Investor Update — Strategic Briefing</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:600;color:#FFFFFF;letter-spacing:-0.02em">${startupName}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#93C5FD">${monthYear} · From ${founderName}</p>
            </td>
          </tr>

          <!-- QScore -->
          <tr>
            <td style="padding:28px 40px 0">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F0F9FF;border-radius:8px;padding:16px">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#0369A1">Edge Alpha QScore</p>
                    <p style="margin:0;font-size:28px;font-weight:700;color:#1E3A5F">${qscoreLabel}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#0369A1">Composite startup health score</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metrics -->
          <tr>
            <td style="padding:24px 40px 0">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280">Key Metrics</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E7EB">
                ${metricRow('MRR', mrr)}
                ${metricRow('Growth', growth)}
                ${metricRow('Runway', runway)}
              </table>
            </td>
          </tr>

          <!-- Strategy section -->
          <tr>
            <td style="padding:0 40px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${focusSection}
                ${okrSection}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px 40px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E5E7EB">
                <tr>
                  <td style="padding-top:20px">
                    <p style="margin:0;font-size:13px;color:#6B7280">Sent via <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a> · Sage Strategy Agent</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF">Reply to this email to connect with ${founderName} directly.</p>
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
    const { contactIds } = body as { contactIds: string[] }

    if (!contactIds?.length) {
      return NextResponse.json({ error: 'contactIds is required' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch investor contacts — must belong to auth user
    const { data: contacts, error: contactsError } = await supabase
      .from('investor_contacts')
      .select('id, name, email, firm')
      .eq('user_id', user.id)
      .in('id', contactIds)

    if (contactsError || !contacts?.length) {
      return NextResponse.json({ error: 'No valid investor contacts found' }, { status: 404 })
    }

    // Fetch founder profile
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const startupName = profile?.startup_name ?? 'Our Startup'
    const founderName = profile?.full_name ?? 'The Founder'

    // Fetch latest qscore_history row
    const { data: qscoreRow } = await supabase
      .from('qscore_history')
      .select('overall_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch latest financial_summary artifact
    const { data: financialArtifact } = await adminClient
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('artifact_type', 'financial_summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Fetch latest strategic_plan artifact
    const { data: strategicArtifact } = await adminClient
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .in('artifact_type', ['strategic_plan', 'okr_plan', 'roadmap'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email sending not configured' }, { status: 503 })
    }

    const now = new Date()
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const subject = `${startupName} — Strategic Investor Update ${monthYear}`
    const qscoreData = qscoreRow as Record<string, unknown> | null
    const financialData = financialArtifact?.content as Record<string, unknown> | null
    const strategicData = strategicArtifact?.content as Record<string, unknown> | null

    const bodyHtml = buildSageInvestorUpdateHtml(
      startupName,
      founderName,
      qscoreData,
      financialData,
      strategicData,
      subject
    )

    // Send to each contact
    let sentCount = 0
    const recipients: string[] = []

    for (const contact of contacts as InvestorContact[]) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Edge Alpha <noreply@edgealpha.ai>',
            to: contact.email,
            subject,
            html: bodyHtml,
          }),
        })
        if (res.ok) {
          sentCount++
          recipients.push(contact.email)
        } else {
          const errText = await res.text()
          console.error(`Resend error for ${contact.email}:`, errText)
        }
      } catch (err) {
        console.error(`Failed to send to ${contact.email}:`, err)
      }
    }

    // Insert into investor_updates table
    await supabase.from('investor_updates').insert({
      user_id: user.id,
      subject,
      body_html: bodyHtml,
      metrics_snapshot: {
        qscore: qscoreData,
        financial: financialData,
        strategic: strategicData,
      },
      recipients,
      sent_at: new Date().toISOString(),
    })

    // Log to agent_activity
    await adminClient.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'sage',
      action_type: 'send_investor_update',
      description: `Sent strategic investor update to ${sentCount} contact${sentCount !== 1 ? 's' : ''}`,
      metadata: { sentCount, contactIds, subject },
    })

    return NextResponse.json({ success: true, sentCount })
  } catch (err) {
    console.error('Sage investor-update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
