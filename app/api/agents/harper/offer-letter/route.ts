import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/harper/offer-letter
// Body: { candidateName, candidateEmail, role, salary, equity, startDate, vestingSchedule?, send?: boolean }
// Generates an offer letter HTML + optionally sends via Resend

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      candidateName,
      candidateEmail,
      role,
      salary,
      equity,
      startDate,
      vestingSchedule = '4-year vesting with a 1-year cliff',
      send = false,
    } = await request.json()

    if (!candidateName || !role || !salary) {
      return NextResponse.json({ error: 'candidateName, role, and salary are required' }, { status: 400 })
    }

    // Get company name from founder profile
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const companyName = (profile?.startup_name as string | undefined) ?? 'Company Name'
    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const offerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offer Letter — ${candidateName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #fff; color: #18160F; max-width: 680px; margin: 60px auto; padding: 40px 48px; line-height: 1.75; font-size: 14px; border: 1px solid #E2DDD5; border-radius: 4px; }
  .header { border-bottom: 2px solid #18160F; padding-bottom: 24px; margin-bottom: 32px; }
  .company { font-size: 22px; font-weight: 700; font-family: -apple-system, system-ui, sans-serif; color: #18160F; margin-bottom: 4px; }
  .date { font-size: 13px; color: #8A867C; }
  h2 { font-size: 16px; font-weight: 700; font-family: -apple-system, system-ui, sans-serif; margin: 28px 0 12px; border-bottom: 1px solid #E2DDD5; padding-bottom: 6px; }
  p { margin-bottom: 14px; }
  .highlight-box { background: #F9F7F2; border: 1px solid #E2DDD5; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2DDD5; }
  .row:last-child { border-bottom: none; }
  .label { font-weight: 600; font-size: 13px; color: #8A867C; font-family: -apple-system, system-ui, sans-serif; }
  .value { font-weight: 700; font-size: 14px; color: #18160F; }
  .signature-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-line { border-top: 1px solid #18160F; padding-top: 8px; margin-top: 48px; }
  .sig-label { font-size: 12px; color: #8A867C; font-family: -apple-system, system-ui, sans-serif; }
  @media print { body { border: none; margin: 0; padding: 32px 40px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName}</div>
    <div class="date">${today}</div>
  </div>

  <p>Dear ${candidateName},</p>

  <p>We are pleased to offer you employment with <strong>${companyName}</strong> in the role of <strong>${role}</strong>. We are excited about the possibility of you joining our team and look forward to your contributions as we build something exceptional together.</p>

  <h2>Compensation &amp; Benefits</h2>
  <div class="highlight-box">
    <div class="row">
      <span class="label">Position</span>
      <span class="value">${role}</span>
    </div>
    <div class="row">
      <span class="label">Start Date</span>
      <span class="value">${startDate || 'To be mutually agreed'}</span>
    </div>
    <div class="row">
      <span class="label">Base Salary</span>
      <span class="value">${salary}</span>
    </div>
    ${equity ? `<div class="row">
      <span class="label">Equity Grant</span>
      <span class="value">${equity}</span>
    </div>` : ''}
    <div class="row">
      <span class="label">Vesting Schedule</span>
      <span class="value">${vestingSchedule}</span>
    </div>
    <div class="row">
      <span class="label">Employment Type</span>
      <span class="value">Full-Time</span>
    </div>
  </div>

  <h2>Equity Details</h2>
  ${equity ? `<p>Subject to the approval of the Board of Directors, you will be granted stock options representing <strong>${equity}</strong> of the Company's fully diluted capitalization. This grant will vest over <strong>${vestingSchedule}</strong>. Your equity is subject to the terms of the Company's equity incentive plan and related award agreements.</p>` : '<p>Equity compensation details will be provided separately upon joining.</p>'}

  <h2>Employment Conditions</h2>
  <p>This offer is contingent upon: (a) your satisfactory completion of our standard background and reference checks; (b) your execution of our standard Employee Confidential Information and Inventions Assignment Agreement ("CIIAA"); and (c) your eligibility to work in the applicable jurisdiction.</p>

  <p>Your employment with ${companyName} will be "at-will," meaning that either you or the Company may terminate the employment relationship at any time, with or without cause, and with or without advance notice.</p>

  <h2>Confidentiality</h2>
  <p>As a condition of your employment, you will be required to execute the Company's standard CIIAA, which includes provisions relating to the protection of the Company's confidential information and the assignment of inventions created in the course of your employment.</p>

  <h2>Expiration</h2>
  <p>This offer letter will remain open for <strong>5 business days</strong> from the date of this letter. If you accept this offer, please sign and return this letter by that date. This offer letter, along with the CIIAA, constitutes the entire agreement between you and ${companyName} with respect to the subject matter hereof.</p>

  <p>We are very excited about the prospect of you joining the team at ${companyName}. If you have any questions about this offer, please do not hesitate to contact us.</p>

  <p>Sincerely,</p>

  <div class="signature-block">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">${founderName}</div>
      <div class="sig-label">${companyName}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">${candidateName} — Acceptance</div>
      <div class="sig-label">Date: ________________</div>
    </div>
  </div>
</body>
</html>`

    // Optionally send via email
    if (send && candidateEmail) {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${founderName} via ${companyName} <no-reply@edgealpha.ai>`,
              to: [candidateEmail],
              subject: `Offer Letter — ${role} at ${companyName}`,
              html: `<p>Hi ${candidateName},</p><p>Please find your offer letter attached below. We're excited to have you join the team!</p><p>To accept this offer, please print, sign, and email the signed copy back to us.</p><p>Best,<br>${founderName}<br>${companyName}</p><hr style="margin:32px 0;border:none;border-top:1px solid #eee"><p style="font-size:12px;color:#888">Offer details: ${role} · ${salary}${equity ? ` · ${equity} equity` : ''} · Start: ${startDate || 'TBD'}</p>`,
            }),
          })
        } catch { /* non-critical */ }
      }
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'harper',
        action_type: 'offer_letter',
        description: `Offer letter generated for ${candidateName} — ${role}`,
        metadata: { candidateName, role, salary, sent: send && !!candidateEmail },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ html: offerHtml, company: companyName })
  } catch (err) {
    console.error('Harper offer letter error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
