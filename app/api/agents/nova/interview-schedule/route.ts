import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/nova/interview-schedule
// Body: {
//   contacts: Array<{ name: string; email: string; company?: string }>,
//   calendlyUrl?: string,     // If set, book-a-call CTA links to this
//   interviewContext?: string, // what your product does — personalises the email
//   artifactId?: string,      // pmf_survey artifact ID for context
// }
// Sends personalised customer interview invite emails to each contact.
// Each email explains why you want to talk, what's in it for them, and includes
// a booking link (Calendly if provided, otherwise mailto CTA).

interface Contact {
  name: string
  email: string
  company?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contacts, calendlyUrl, interviewContext, artifactId } = await request.json()

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'contacts array is required' }, { status: 400 })
    }
    if (contacts.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 contacts per batch' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 })
    }

    // Founder profile
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name, calendly_url')
      .eq('user_id', user.id)
      .single()

    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'
    const companyName = (profile?.startup_name as string | undefined) ?? 'our company'
    const founderEmail = user.email!
    const bookingUrl = calendlyUrl?.trim() || (profile?.calendly_url as string | undefined) || null

    // Optional: pull pmf_survey artifact for context
    let surveyContext = interviewContext || ''
    if (!surveyContext && artifactId) {
      try {
        const { data: artifact } = await supabase
          .from('agent_artifacts')
          .select('content')
          .eq('id', artifactId)
          .eq('user_id', user.id)
          .single()
        if (artifact?.content) {
          const c = artifact.content as Record<string, unknown>
          const audience = c.targetAudience as string | undefined
          if (audience) surveyContext = audience
        }
      } catch { /* non-critical */ }
    }

    const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = []
    let sent = 0
    let failed = 0

    for (const contact of contacts as Contact[]) {
      if (!contact.email || !contact.name) continue

      const firstName = contact.name.split(' ')[0] || contact.name
      const ctaHtml = bookingUrl
        ? `<a href="${bookingUrl}" style="display:inline-block;padding:10px 22px;background:#18160F;color:#F9F7F2;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:18px">Book a 20-min call →</a>`
        : `<a href="mailto:${founderEmail}?subject=Happy%20to%20chat%20with%20${companyName}" style="display:inline-block;padding:10px 22px;background:#18160F;color:#F9F7F2;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:18px">Reply to schedule →</a>`

      const emailHtml = `
<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;margin:0;padding:40px 20px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #E2DDD5;overflow:hidden">
  <div style="background:#18160F;padding:24px 32px">
    <p style="color:rgba(249,247,242,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 4px">Customer Interview</p>
    <p style="color:#F9F7F2;font-size:17px;font-weight:700;margin:0">Quick 20-min conversation?</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;color:#18160F;line-height:1.7;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:15px;color:#18160F;line-height:1.7;margin:0 0 16px">
      I'm ${founderName}, founder of <strong>${companyName}</strong>. I'm doing early customer research${surveyContext ? ` for ${surveyContext}` : ''} and I'd love to spend 20 minutes understanding your experience — no sales pitch, just listening.
    </p>
    <p style="font-size:15px;color:#18160F;line-height:1.7;margin:0 0 16px">
      Specifically, I'd love to learn:
    </p>
    <ul style="padding-left:20px;margin:0 0 20px">
      <li style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:6px">What challenges are you running into today?</li>
      <li style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:6px">How are you currently solving them?</li>
      <li style="font-size:14px;color:#374151;line-height:1.7">What would an ideal solution look like?</li>
    </ul>
    <p style="font-size:15px;color:#18160F;line-height:1.7;margin:0 0 4px">In return: I'll share what we're learning and give you early access when we launch.</p>
    ${ctaHtml}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E2DDD5">
      <p style="font-size:13px;color:#8A867C;margin:0">${founderName}</p>
      <p style="font-size:12px;color:#8A867C;margin:4px 0 0">${companyName} · <a href="mailto:${founderEmail}" style="color:#2563EB;text-decoration:none">${founderEmail}</a></p>
    </div>
  </div>
</div>
</body></html>`

      try {
        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${founderName} at ${companyName} <no-reply@edgealpha.ai>`,
            to: [contact.email],
            reply_to: founderEmail,
            subject: `Quick chat? — ${companyName} customer research`,
            html: emailHtml,
          }),
        })

        if (sendRes.ok) {
          results.push({ email: contact.email, status: 'sent' })
          sent++
        } else {
          const err = await sendRes.json().catch(() => ({})) as { message?: string }
          results.push({ email: contact.email, status: 'failed', error: err.message ?? 'Send failed' })
          failed++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ email: contact.email, status: 'failed', error: msg })
        failed++
      }

      // Small delay to stay under burst limits
      await new Promise(r => setTimeout(r, 150))
    }

    // Log activity
    if (sent > 0) {
      try {
        await supabase.from('agent_activity').insert({
          user_id: user.id,
          agent_id: 'nova',
          action_type: 'interview_invites_sent',
          description: `Sent ${sent} customer interview invite${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`,
          metadata: { sent, failed, calendlyUrl: bookingUrl },
        })
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ sent, failed, results })
  } catch (err) {
    console.error('Nova interview-schedule error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
