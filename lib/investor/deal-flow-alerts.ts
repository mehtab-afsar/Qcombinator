import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import { encodeToken } from '@/lib/email/unsubscribe-token'
import { APP_URL, APP_DOMAIN } from '@/lib/constants/app'
import { log } from '@/lib/logger'

/**
 * Trigger deal-flow alerts — in-app notification AND email — for investors when a startup's
 * Q-Score improves significantly after profile-builder submit.
 *
 * Fire-and-forget: call with void and .catch(() => {}) at the call site.
 *
 * Matching logic: investors whose sectors or stages arrays overlap with the founder's
 * industry / stage receive a notification row (type = 'qscore_update') AND, if they have an
 * email on file and haven't opted out, a "New deal matching your thesis" email. One query decides
 * both — this used to be two separate, differently-scoped implementations (this in-app one, live,
 * and a standalone email-only route whose only trigger points had been deleted elsewhere, so it
 * never actually fired). Merged here rather than left as two parallel systems.
 *
 * Only fires when the score improvement is >= 5 points compared to the previous profile_builder
 * submission (not agent-completion nudges) — this doubles as the "don't re-alert on every minor
 * resubmission" guard.
 */
export async function triggerDealFlowAlerts(
  founderId: string,
  newScore: number,
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Get previous profile_builder score to measure real improvement
    const { data: history } = await supabase
      .from('qscore_history')
      .select('overall_score')
      .eq('user_id', founderId)
      .eq('data_source', 'profile_builder')
      .order('calculated_at', { ascending: false })
      .limit(2)

    if (!history || history.length < 2) return // No previous submission to compare

    const previousScore = history[1].overall_score as number
    const improvement = newScore - previousScore
    if (improvement < 5) return // Only alert on significant improvement

    // Only alert when founder is in the investor-visible threshold (>= 50)
    if (newScore < 50) return

    // Get founder profile for sector/stage matching
    const { data: founder } = await supabase
      .from('founder_profiles')
      .select('industry, stage, startup_name, full_name, tagline')
      .eq('user_id', founderId)
      .single()

    if (!founder?.industry || !founder?.stage) return

    // Sanitize for PostgREST contains filter
    const safeIndustry = String(founder.industry).replace(/[{},"\\]/g, '')
    const safeStage    = String(founder.stage).replace(/[{},"\\]/g, '')

    // Find investors whose sectors or stages overlap with this founder
    const { data: investors, error } = await supabase
      .from('investor_profiles')
      .select('user_id, full_name, email, firm_name, deal_flow_notifications')
      .or(`sectors.cs.{${safeIndustry}},stages.cs.{${safeStage}}`)
      .neq('user_id', founderId)
      .limit(100)

    if (error || !investors?.length) return

    // Filter to those who have deal_flow_notifications enabled (null = opt-in by default)
    const eligible = investors.filter(inv => inv.deal_flow_notifications !== false)
    if (!eligible.length) return

    const companyName = founder.startup_name ?? founder.full_name ?? 'A startup'

    // Insert in-app notifications in bulk
    const notificationRows = eligible.map(inv => ({
      user_id:  inv.user_id,
      type:     'qscore_update',
      title:    `${companyName} Q-Score improved by ${improvement} points`,
      body:     `${companyName} now has a Q-Score of ${newScore}. Their profile matches your investment thesis.`,
      metadata: {
        founder_id:   founderId,
        new_score:    newScore,
        prev_score:   previousScore,
        improvement,
        industry:     founder.industry,
        stage:        founder.stage,
      },
      read: false,
    }))

    const { error: insertErr } = await supabase
      .from('notifications')
      .insert(notificationRows)

    if (insertErr) {
      log.error('triggerDealFlowAlerts notifications insert', { insertErr })
    }

    await sendDealFlowEmails({
      founderId, companyName, founderName: founder.full_name ?? 'The founder',
      tagline: founder.tagline ?? null, industry: founder.industry, stage: founder.stage,
      qScore: newScore, eligible,
    })
  } catch (err) {
    log.error('triggerDealFlowAlerts', { err })
  }
}

interface EligibleInvestor {
  user_id: string
  full_name: string | null
  email: string | null
  firm_name: string | null
}

async function sendDealFlowEmails(params: {
  founderId: string
  companyName: string
  founderName: string
  tagline: string | null
  industry: string
  stage: string
  qScore: number
  eligible: EligibleInvestor[]
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    log.warn('[deal-flow-alerts] RESEND_API_KEY not configured — email alerts skipped, in-app notification still sent')
    return
  }

  const { founderId, companyName, founderName, tagline, industry, stage, qScore, eligible } = params
  const withEmail = eligible.filter(inv => inv.email)
  if (!withEmail.length) return

  const resend = new Resend(resendKey)
  const scoreColor = qScore >= 70 ? '#16A34A' : qScore >= 50 ? '#D97706' : '#DC2626'
  const publicUrl = `${APP_URL}/investor/startup/${founderId}`

  const emailPayloads = withEmail.map(investor => {
    const greeting = investor.full_name ? `Hi ${investor.full_name.split(' ')[0]},` : 'Hi,'
    const firmLine = investor.firm_name ? ` at ${investor.firm_name}` : ''
    return {
      investorId: investor.user_id,
      email: {
        from:    `Edge Alpha <deals@${APP_DOMAIN}>`,
        to:      investor.email!,
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
                  <p style="margin:0 0 2px;font-size:18px;font-weight:600;color:#18160F;letter-spacing:-0.02em">${companyName}</p>
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
              View Founder →
            </a>
            <p style="margin:12px 0 0;font-size:11px;color:#8A867C">
              Or <a href="${APP_URL}/investor/deal-flow" style="color:#2563EB;text-decoration:none">browse all deal flow</a> on your dashboard
            </p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E2DDD5">
            <p style="margin:0;font-size:11px;color:#8A867C;text-align:center">
              You received this because you opted in to deal flow alerts on
              <a href="${APP_URL}" style="color:#2563EB;text-decoration:none"> Edge Alpha</a>.
              <a href="${APP_URL}/investor/settings" style="color:#2563EB;text-decoration:none"> Manage notifications</a> ·
              <a href="${APP_URL}/api/unsubscribe?token=${encodeToken(investor.user_id, 'alerts')}" style="color:#8A867C;text-decoration:none">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      },
    }
  })

  const outcomes = await Promise.allSettled(emailPayloads.map(p => resend.emails.send(p.email)))

  let sent = 0
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i].status === 'fulfilled') sent++
    else log.error(`[deal-flow-alerts] email failed for investor ${emailPayloads[i].investorId}:`, (outcomes[i] as PromiseRejectedResult).reason)
  }

  try {
    const supabase = createAdminClient()
    await supabase.from('agent_activity').insert({
      user_id:     founderId,
      agent_id:    'system',
      action_type: 'investor_alert_sent',
      description: `Deal alert emailed to ${sent} matching investor${sent !== 1 ? 's' : ''} — Q-Score ${qScore}`,
      metadata:    { qScore, sent, industry, stage },
    })
  } catch { /* non-fatal */ }
}
