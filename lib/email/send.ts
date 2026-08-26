import { Resend } from 'resend'
import { log } from '@/lib/logger'
import { APP_EMAIL_FROM, APP_URL as APP_BASE_URL, APP_DOMAIN } from '@/lib/constants/app'
import { bg, surf, bdr, ink, muted, blue, amber } from '@/lib/constants/colors'

const FROM    = APP_EMAIL_FROM
const APP_URL = APP_BASE_URL

// Email-safe serif stack — Fraunces (the site's real display face) isn't reliably embeddable
// across mail clients, so this is the closest system fallback, used only where a template wants
// the site's editorial voice rather than the shell's plain sans body copy.
const FONT_SERIF = `Georgia, 'Iowan Old Style', 'Times New Roman', serif`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    log.warn('[email] RESEND_API_KEY not set — all email silently skipped')
    return null
  }
  return new Resend(key)
}

function emailShell(body: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:${bg};border-radius:12px;overflow:hidden;color:${ink}">
      <div style="background:${ink};padding:16px 32px;display:flex;align-items:center">
        <span style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:${bg}">EDGE ALPHA</span>
      </div>
      <div style="padding:40px 32px 32px">
        ${body}
      </div>
      <div style="padding:16px 32px;border-top:1px solid ${bdr}">
        <p style="font-size:11px;color:${muted};margin:0;line-height:1.6">
          You're receiving this because you have an Edge Alpha founder account.
          <br>© 2026 Edge Alpha · <a href="${APP_URL}" style="color:${muted}">${APP_DOMAIN}</a>
        </p>
      </div>
    </div>
  `
}

function ctaBtn(href: string, label: string, primary = true): string {
  const btnBg    = primary ? ink : surf
  const btnColor = primary ? bg : ink
  return `<a href="${href}" style="display:inline-block;background:${btnBg};color:${btnColor};text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em">${label}</a>`
}

// ─── Connection accepted (existing) ───────────────────────────────────────────

export interface ConnectionAcceptedParams {
  founderEmail: string
  founderName: string
  startupName: string
  investorEmail: string
  investorName: string
  investorFirm: string
}

export async function sendConnectionAcceptedEmails(params: ConnectionAcceptedParams) {
  const resend = getResend()
  if (!resend) return

  const { founderEmail, founderName, startupName, investorEmail, investorName, investorFirm } = params

  const founderHtml = emailShell(`
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Great news, ${founderName}</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 24px">
      <strong>${investorName}</strong> from <strong>${investorFirm}</strong> has accepted your connection
      request for <strong>${startupName}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 32px">
      They'll be in touch soon to schedule a meeting. You can also reach out directly through your dashboard.
    </p>
    ${ctaBtn(`${APP_URL}/founder/messages`, 'Open Messages →')}
  `)

  const investorHtml = emailShell(`
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Connection confirmed</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 24px">
      You've accepted the connection request from <strong>${founderName}</strong> (<strong>${startupName}</strong>).
    </p>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 32px">
      We've notified the founder. You can message them directly from your Edge Alpha dashboard.
    </p>
    ${ctaBtn(`${APP_URL}/investor/messages`, 'Open Messages →')}
  `)

  const [founderResult, investorResult] = await Promise.allSettled([
    resend.emails.send({ from: FROM, to: founderEmail, subject: `${investorName} accepted your connection request`, html: founderHtml }),
    resend.emails.send({ from: FROM, to: investorEmail, subject: `Connection confirmed — ${startupName}`, html: investorHtml }),
  ])

  if (founderResult.status  === 'rejected') log.error('Failed to send founder email:', founderResult.reason)
  if (investorResult.status === 'rejected') log.error('Failed to send investor email:', investorResult.reason)
}

// ─── Welcome + email confirmation ─────────────────────────────────────────────

export interface WelcomeEmailParams {
  email: string
  fullName: string
  startupName: string
}

// The confirmation link itself is Supabase's job now (native email confirmation, configured in
// the Supabase Dashboard's SMTP/template settings) — this email is purely a warm welcome, sent
// independently at signup. It used to also carry the confirm link before that switch.
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { email, fullName, startupName } = params
  const firstName = fullName.split(' ')[0] || fullName

  const html = emailShell(`
    <p style="font-family:${FONT_SERIF};font-size:30px;font-weight:400;letter-spacing:-0.01em;margin:0 0 6px;color:${ink}">Welcome, ${firstName} 👋</p>
    <p style="font-size:12px;color:${muted};margin:0 0 28px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">${startupName}</p>

    <p style="font-size:15px;line-height:1.7;color:${ink};margin:0 0 12px">
      Your Edge Alpha account is live. Check your inbox for a separate email confirming your
      address — click it to unlock investor matching.
    </p>

    <p style="font-size:15px;line-height:1.7;color:${ink};margin:0 0 28px">
      The fastest way in: upload your pitch deck. Profile Builder reads it and calculates your
      first Q-Score in minutes.
    </p>

    <div style="margin:0 0 32px">
      ${ctaBtn(`${APP_URL}/founder/profile-builder`, 'Upload your pitch deck →')}
    </div>

    <div style="background:${surf};border-radius:10px;padding:20px 24px;margin:0 0 20px">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${muted};margin:0 0 14px">What happens next</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="background:${ink};color:${bg};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;line-height:20px;text-align:center">1</span>
          <div>
            <p style="font-size:13px;font-weight:600;color:${ink};margin:0 0 2px">Upload your pitch deck</p>
            <p style="font-size:12px;color:${muted};margin:0">Profile Builder auto-extracts your metrics and scores your startup.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="background:${ink};color:${bg};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;line-height:20px;text-align:center">2</span>
          <div>
            <p style="font-size:13px;font-weight:600;color:${ink};margin:0 0 2px">Your executive team goes to work</p>
            <p style="font-size:12px;color:${muted};margin:0">Five AI executives — CEO, growth, finance, product, ops. Real, versioned deliverables every cycle — not chat replies.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="background:${ink};color:${bg};border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;line-height:20px;text-align:center">3</span>
          <div>
            <p style="font-size:13px;font-weight:600;color:${ink};margin:0 0 2px">Match with investors</p>
            <p style="font-size:12px;color:${muted};margin:0">Your Q-Score unlocks curated investor intros based on stage and sector.</p>
          </div>
        </div>
      </div>
    </div>

    <div style="padding:16px 20px;background:${surf};border-radius:10px">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${muted};margin:0 0 8px">New to the platform?</p>
      <p style="font-size:13px;color:${ink};margin:0 0 10px;line-height:1.6">
        Read the Getting Started Guide — Q-Score, your executive team, investor matching, and
        your first 30 days.
      </p>
      <a href="${APP_URL}/getting-started" style="font-size:12px;color:${blue};font-weight:600;text-decoration:none">View Getting Started Guide →</a>
    </div>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Welcome to Edge Alpha, ${firstName}`,
    html,
  })

  if (error) log.error('[email] sendWelcomeEmail failed:', error)
}

// ─── Day-1 drip: Profile Builder nudge ────────────────────────────────────────

export interface DripEmailParams {
  email: string
  fullName: string
}

export async function sendDay1NudgeEmail(params: DripEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { email, fullName } = params
  const firstName = fullName.split(' ')[0] || fullName

  const html = emailShell(`
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Your Q-Score is 0, ${firstName}</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 16px">
      You signed up yesterday but haven't uploaded your deck yet. Your Q-Score stays at zero until we
      can assess your startup — and investors won't see you until it's above 40.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 28px">
      Upload your pitch deck or answer a few questions in Profile Builder — it takes under 5 minutes.
    </p>
    ${ctaBtn(`${APP_URL}/founder/profile-builder`, 'Build your profile →')}

    <div style="background:#F0EDE6;border-radius:10px;padding:16px 20px;margin:28px 0 0">
      <p style="font-size:13px;color:#18160F;margin:0;line-height:1.6">
        <strong>Supported formats:</strong> PDF, PPTX, DOCX, XLSX, CSV, images, and more.
        The AI auto-extracts metrics, team details, and financials.
      </p>
    </div>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `${firstName}, your Q-Score is still 0 — fix it in 5 minutes`,
    html,
  })

  if (error) log.error('[email] sendDay1NudgeEmail failed:', error)
}

// ─── Day-7 drip: AI advisors re-engagement ────────────────────────────────────

export async function sendDay7NudgeEmail(params: DripEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { email, fullName } = params
  const firstName = fullName.split(' ')[0] || fullName

  const html = emailShell(`
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px">Your advisors haven't heard from you</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 16px">
      Hi ${firstName} — it's been a week since you joined Edge Alpha and your AI advisors
      are waiting. Here's what they can build for you today:
    </p>

    <div style="background:#F0EDE6;border-radius:10px;padding:20px 24px;margin:0 0 28px">
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[
          ['Patel (GTM)', 'Full go-to-market playbook + ICP + outreach sequences'],
          ['Felix (Finance)', 'Financial model, investor update, Stripe metrics'],
          ['Harper (Hiring)', 'Job descriptions, hiring plan, resume screener'],
          ['Atlas (Strategy)', 'Competitive matrix with live market data'],
          ['Leo (Legal)', 'Legal checklist, NDA template, IP protection plan'],
        ].map(([name, desc]) => `
          <div style="display:flex;gap:12px;align-items:flex-start">
            <span style="font-size:12px;font-weight:700;color:#2563EB;white-space:nowrap;padding-top:1px">${name}</span>
            <span style="font-size:12px;color:#8A867C;line-height:1.5">${desc}</span>
          </div>
        `).join('')}
      </div>
    </div>

    ${ctaBtn(`${APP_URL}/founder/executive`, 'Meet your advisors →')}
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `${firstName}, 9 AI advisors are waiting for you`,
    html,
  })

  if (error) log.error('[email] sendDay7NudgeEmail failed:', error)
}

// ─── Portfolio invite (investor → founder) ────────────────────────────────────

export interface PortfolioInviteParams {
  to: string
  investorName: string
  firmName: string
  companyName: string
  inviteUrl: string
}

export async function sendPortfolioInviteEmail(params: PortfolioInviteParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { to, investorName, firmName, companyName, inviteUrl } = params

  const html = emailShell(`
    <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#8A867C;margin:0 0 24px">Portfolio Invitation</p>
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px;line-height:1.2">
      You've been invited to join Edge Alpha
    </h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 24px">
      <strong>${investorName}</strong>${firmName ? ` from <strong>${firmName}</strong>` : ''} has added
      <strong>${companyName}</strong> to their portfolio on Edge Alpha and invited you to join.
    </p>
    <p style="font-size:14px;line-height:1.7;color:#8A867C;margin:0 0 32px">
      Edge Alpha gives your team access to 11 AI advisers (CFO, CMO, CLO, and more),
      an investment-readiness score, and a direct channel with your investor — all in one place.
    </p>
    <div style="margin-bottom:32px">
      ${ctaBtn(inviteUrl, 'Create your account →')}
    </div>
    <p style="font-size:12px;color:#8A867C;margin:0">
      This invite is personal to ${companyName}. It expires in 30 days.
    </p>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to,
    subject: `${investorName} invited ${companyName} to Edge Alpha`,
    html,
  })

  if (error) log.error('[email] sendPortfolioInviteEmail failed:', error)
}

// ─── Team invite email ────────────────────────────────────────────────────────

export interface TeamInviteEmailParams {
  toEmail:     string
  inviterName: string
  startupName: string
  role:        string
  token:       string
}

// Returns whether the email actually sent — the caller has no other way to notify the invitee
// (the account doesn't exist yet), so silently swallowing a failure here means an inviter is
// told "invite sent" while nobody ever received anything. Same reasoning, same pattern as
// sendInvestorTeamInviteEmail below.
export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const { toEmail, inviterName, startupName, role, token } = params
  const joinUrl  = `${APP_URL}/founder/join?teamToken=${token}`
  const roleLabel: Record<string, string> = { admin: 'Co-founder (Admin)', member: 'Team Member', viewer: 'Viewer' }

  const html = emailShell(`
    <h1 style="font-size:24px;font-weight:700;margin:0 0 12px">You're invited to ${startupName}</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 8px">
      <strong>${inviterName}</strong> has invited you to join <strong>${startupName}</strong> on Edge Alpha as <strong>${roleLabel[role] ?? role}</strong>.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#8A867C;margin:0 0 28px">
      Edge Alpha is an AI advisory platform — your team will get an AI CMO, CFO, CPO and 8 more C-suite advisors, a Q-Score tracking your startup's readiness, and access to 500+ investors.
    </p>
    ${ctaBtn(joinUrl, 'Accept invite →')}
    <p style="font-size:12px;color:#8A867C;margin:24px 0 0;line-height:1.6">
      Link expires in 7 days. Copy it if the button doesn't work:<br>
      <a href="${joinUrl}" style="color:#2563EB;word-break:break-all">${joinUrl}</a>
    </p>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      toEmail,
    subject: `${inviterName} invited you to join ${startupName} on Edge Alpha`,
    html,
  })

  if (error) { log.error('[email] sendTeamInviteEmail failed:', error); return false }
  return true
}

// ─── Investor team invite email ───────────────────────────────────────────────
// Same shape as sendTeamInviteEmail — a fund/firm invite rather than a startup one,
// investor_team_invites' two-role model (admin/analyst) rather than founder's four-tier one.

export interface InvestorTeamInviteEmailParams {
  toEmail:     string
  inviterName: string
  firmName:    string
  role:        'admin' | 'analyst'
  token:       string
}

// Returns whether the email actually sent — the caller has no other way to notify the invitee
// (the account doesn't exist yet), so silently swallowing a failure here means an inviter is
// told "invite sent" while nobody ever received anything.
export async function sendInvestorTeamInviteEmail(params: InvestorTeamInviteEmailParams): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const { toEmail, inviterName, firmName, role, token } = params
  const joinUrl = `${APP_URL}/investor/join?token=${token}`
  const roleLabel = role === 'admin' ? 'Admin' : 'Analyst'

  const html = emailShell(`
    <h1 style="font-size:24px;font-weight:700;margin:0 0 12px">You're invited to ${firmName}</h1>
    <p style="font-size:15px;line-height:1.7;color:#18160F;margin:0 0 8px">
      <strong>${inviterName}</strong> has invited you to join <strong>${firmName}</strong> on Edge Alpha as <strong>${roleLabel}</strong>.
    </p>
    ${ctaBtn(joinUrl, 'Accept invite →')}
    <p style="font-size:12px;color:#8A867C;margin:24px 0 0;line-height:1.6">
      Link expires in 7 days. Copy it if the button doesn't work:<br>
      <a href="${joinUrl}" style="color:#2563EB;word-break:break-all">${joinUrl}</a>
    </p>
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      toEmail,
    subject: `${inviterName} invited you to join ${firmName} on Edge Alpha`,
    html,
  })

  if (error) {
    log.error('[email] sendInvestorTeamInviteEmail failed:', error)
    return false
  }
  return true
}

// ─── Action needs approval ─────────────────────────────────────────────────────
// The email side of lib/actions/notify-pending.ts — the one real approval checkpoint in the
// product (ADR-002/ADR-004: no gates anywhere else). No recipient content here, same PII
// discipline as action_log itself: a name and a count, never an address or a message body.

export interface ActionPendingEmailParams {
  email: string
  fullName: string
  actionName: string
  /** Already-redacted, e.g. "3 recipients — acme.com, initech.com" — see payloadMetadata. */
  summary?: string
}

export async function sendActionPendingEmail(params: ActionPendingEmailParams): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { email, fullName, actionName, summary } = params
  const firstName = fullName.split(' ')[0] || fullName

  const html = emailShell(`
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${amber};margin:0 0 20px">Needs your approval</p>
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;margin:0 0 16px;line-height:1.25">${actionName}</h1>
    <p style="font-size:15px;line-height:1.7;color:${ink};margin:0 0 8px">
      Hi ${firstName} — your executive team prepared this and it's ready to go, but it reaches
      outside Edge Alpha, so it waits for you.
    </p>
    ${summary ? `<p style="font-size:13px;color:${muted};margin:0 0 28px">${summary}</p>` : '<div style="margin-bottom:28px"></div>'}
    ${ctaBtn(`${APP_URL}/founder/executive`, 'Review and approve →')}
  `)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Needs your approval: ${actionName}`,
    html,
  })

  if (error) log.error('[email] sendActionPendingEmail failed:', error)
}
