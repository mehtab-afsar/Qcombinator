import { Resend } from 'resend'

const FROM = 'Qcombinator <noreply@qcombinator.com>'

export interface ConnectionAcceptedParams {
  founderEmail: string
  founderName: string
  startupName: string
  investorEmail: string
  investorName: string
  investorFirm: string
}

// Send two emails: one to the founder, one to the investor
export async function sendConnectionAcceptedEmails(params: ConnectionAcceptedParams) {
  const key = process.env.RESEND_API_KEY
  if (!key) return  // skip silently if not configured

  const resend = new Resend(key)
  const { founderEmail, founderName, startupName, investorEmail, investorName, investorFirm } = params

  const founderHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#F9F7F2;padding:40px 32px;border-radius:12px;color:#18160F">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#8A867C;margin:0 0 24px">Qcombinator</p>
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Great news, ${founderName}</h1>
      <p style="font-size:15px;line-height:1.6;color:#18160F;margin:0 0 24px">
        <strong>${investorName}</strong> from <strong>${investorFirm}</strong> has accepted your connection request for <strong>${startupName}</strong>.
      </p>
      <p style="font-size:15px;line-height:1.6;color:#18160F;margin:0 0 32px">
        They'll be in touch soon to schedule a meeting. You can also reach out to them directly through the messaging section in your dashboard.
      </p>
      <a href="https://qcombinator.com/founder/messages"
         style="display:inline-block;background:#18160F;color:#F9F7F2;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
        Open Messages →
      </a>
      <p style="font-size:12px;color:#8A867C;margin:40px 0 0">You're receiving this because you have a Qcombinator account.</p>
    </div>
  `

  const investorHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#F9F7F2;padding:40px 32px;border-radius:12px;color:#18160F">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#8A867C;margin:0 0 24px">Qcombinator</p>
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Connection confirmed</h1>
      <p style="font-size:15px;line-height:1.6;color:#18160F;margin:0 0 24px">
        You've accepted the connection request from <strong>${founderName}</strong> (<strong>${startupName}</strong>).
      </p>
      <p style="font-size:15px;line-height:1.6;color:#18160F;margin:0 0 32px">
        We've notified the founder. You can now message them directly from your Qcombinator dashboard.
      </p>
      <a href="https://qcombinator.com/investor/messages"
         style="display:inline-block;background:#18160F;color:#F9F7F2;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
        Open Messages →
      </a>
      <p style="font-size:12px;color:#8A867C;margin:40px 0 0">You're receiving this because you have a Qcombinator investor account.</p>
    </div>
  `

  // Fire both in parallel — don't block on either failure
  const [founderResult, investorResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: founderEmail,
      subject: `${investorName} accepted your connection request`,
      html: founderHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: investorEmail,
      subject: `Connection confirmed — ${startupName}`,
      html: investorHtml,
    }),
  ])

  if (founderResult.status === 'rejected') {
    console.error('Failed to send founder email:', founderResult.reason)
  }
  if (investorResult.status === 'rejected') {
    console.error('Failed to send investor email:', investorResult.reason)
  }
}
