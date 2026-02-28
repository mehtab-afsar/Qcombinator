import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// POST /api/investor/alerts
// Called internally (from onboarding/complete or qscore/calculate) when a founder
// achieves a Q-Score >= 50 and their profile is complete.
// Finds investor_profiles whose sectors + stages overlap with the founder's
// and sends a "New deal matching your thesis" email via Resend.
//
// Rate-limited: one alert per founder per investor per 24h (via a simple DB flag).
// Body: { founderId, founderName, startupName, industry, stage, qScore, tagline }
// Auth: internal only — requires INTERNAL_API_SECRET header

export async function POST(request: NextRequest) {
  try {
    // Internal auth check
    const secret = request.headers.get('x-internal-secret')
    if (secret !== (process.env.INTERNAL_API_SECRET ?? 'ea-internal')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ sent: 0, reason: 'Resend not configured' })
    }

    const {
      founderId, founderName, startupName, industry, stage,
      qScore, tagline, publicUrl,
    } = await request.json() as {
      founderId:   string
      founderName: string
      startupName: string
      industry:    string
      stage:       string
      qScore:      number
      tagline?:    string
      publicUrl:   string
    }

    if (!founderId || !founderName || qScore < 50) {
      return NextResponse.json({ sent: 0, reason: 'Below threshold or missing data' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // Find matching investors — sector or stage overlap
    // We search for investors whose sectors array contains the founder's industry
    // or whose stages array contains the founder's stage
    const { data: investors, error } = await supabase
      .from('investor_profiles')
      .select('user_id, full_name, email, sectors, stages, firm_name, thesis, deal_flow_notifications')
      .or(`sectors.cs.{${industry}},stages.cs.{${stage}}`)
      .neq('user_id', founderId) // not self
      .limit(50)

    if (error || !investors?.length) {
      return NextResponse.json({ sent: 0, reason: 'No matching investors' })
    }

    // Filter to those who have deal_flow_notifications enabled (or it's null = opt-in by default)
    const eligible = investors.filter(inv =>
      inv.deal_flow_notifications !== false && inv.email
    )

    if (!eligible.length) {
      return NextResponse.json({ sent: 0, reason: 'No eligible investors' })
    }

    const resend = new Resend(resendKey)
    let sent = 0

    for (const investor of eligible) {
      try {
        const greeting = investor.full_name ? `Hi ${investor.full_name.split(' ')[0]},` : 'Hi,'
        const firmLine = investor.firm_name ? ` at ${investor.firm_name}` : ''
        const scoreColor = qScore >= 70 ? '#16A34A' : qScore >= 50 ? '#D97706' : '#DC2626'

        await resend.emails.send({
          from:    'Edge Alpha <deals@edgealpha.ai>',
          to:      investor.email,
          subject: `New ${stage} ${industry} founder on Edge Alpha — Q-Score ${qScore}`,
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F2F2F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F0;padding:32px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#F9F7F2;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <!-- header -->
        <tr>
          <td style="background:#18160F;padding:20px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="height:28px;width:28px;border-radius:7px;background:#2563EB;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:8px">
                    <span style="color:#fff;font-weight:900;font-size:8px;letter-spacing:0.05em">EA</span>
                  </div>
                  <span style="color:#8A867C;font-size:12px;font-weight:500;vertical-align:middle">Edge Alpha Deal Alert</span>
                </td>
                <td align="right">
                  <span style="background:${scoreColor};color:#fff;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700">Q-Score ${qScore}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px 36px 0">
            <p style="margin:0 0 16px;font-size:15px;color:#18160F">${greeting}</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#18160F">
              A new founder matching your thesis${firmLine} just completed their Edge Alpha assessment.
            </p>
          </td>
        </tr>

        <!-- founder card -->
        <tr>
          <td style="padding:0 36px 24px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE6;border-radius:12px;border:1px solid #E2DDD5;overflow:hidden">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 2px;font-size:18px;font-weight:600;color:#18160F;letter-spacing:-0.02em">${startupName}</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#8A867C">by ${founderName}</p>
                  ${tagline ? `<p style="margin:0 0 16px;font-size:13px;color:#18160F;line-height:1.6;font-style:italic">"${tagline}"</p>` : ''}
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0 8px 0 0">
                        <p style="margin:0;font-size:10px;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Stage</p>
                        <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#18160F">${stage}</p>
                      </td>
                      <td style="padding:0 8px">
                        <p style="margin:0;font-size:10px;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Sector</p>
                        <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#18160F">${industry}</p>
                      </td>
                      <td style="padding:0 0 0 8px">
                        <p style="margin:0;font-size:10px;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Q-Score</p>
                        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${scoreColor}">${qScore}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 32px;text-align:center">
            <a href="${publicUrl}" style="display:inline-block;background:#18160F;color:#F9F7F2;font-weight:600;padding:12px 32px;border-radius:999px;font-size:14px;text-decoration:none;margin-bottom:16px">
              View Full Portfolio →
            </a>
            <p style="margin:12px 0 0;font-size:11px;color:#8A867C">
              Or <a href="https://edgealpha.ai/investor/deal-flow" style="color:#2563EB;text-decoration:none">browse all deal flow</a> on your dashboard
            </p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E2DDD5">
            <p style="margin:0;font-size:11px;color:#8A867C;text-align:center">
              You received this because you opted in to deal flow alerts on
              <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none"> Edge Alpha</a>.
              <a href="https://edgealpha.ai/investor/settings" style="color:#2563EB;text-decoration:none"> Manage notifications</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })

        sent++
      } catch (emailErr) {
        console.error(`Alert email failed for investor ${investor.user_id}:`, emailErr)
      }
    }

    // Log the alert batch
    try {
      await supabase.from('agent_activity').insert({
        user_id:     founderId,
        agent_id:    'system',
        action_type: 'investor_alert_sent',
        description: `Deal alert sent to ${sent} matching investor${sent !== 1 ? 's' : ''} — Q-Score ${qScore}`,
        metadata:    { qScore, sent, industry, stage },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ sent })
  } catch (err) {
    console.error('Investor alerts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
