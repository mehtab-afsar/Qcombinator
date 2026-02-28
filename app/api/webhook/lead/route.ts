import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/webhook/lead?uid=USER_ID
// Public webhook — no auth required
// Body: { name, email, company?, message?, phone?, source? }
// Susi drafts and sends a personalized response email to the lead within 60s

export async function POST(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get('uid')
    if (!uid) {
      return NextResponse.json({ error: 'uid query param is required' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, company, message, source } = body

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get founder details
    const { data: userData } = await adminClient.auth.admin.getUserById(uid)
    if (!userData?.user) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    const founderEmail = userData.user.email
    if (!founderEmail) {
      return NextResponse.json({ error: 'Founder email not configured' }, { status: 500 })
    }

    const { data: profile } = await adminClient
      .from('founder_profiles')
      .select('startup_name, full_name, calendly_url')
      .eq('user_id', uid)
      .single()

    const companyName = (profile?.startup_name as string | undefined) ?? 'our company'
    const founderName = (profile?.full_name as string | undefined) ?? 'The Founder'
    const calendlyUrl = (profile?.calendly_url as string | undefined) ?? null

    // Generate personalized response via OpenRouter
    let responseEmail = ''

    try {
      responseEmail = (await callOpenRouter(
        [
          {
            role: 'system',
            content: `You are Susi, a sales assistant for ${companyName}. Write a warm, concise, personalized first-touch response email to a new inbound lead. Tone: professional but friendly, not salesy. Max 120 words. Do NOT use "I hope this email finds you well" or any clichés. Do NOT include a subject line — just the email body starting with "Hi [name],". End with a specific CTA (book a call, reply to chat, or demo link).`,
          },
          {
            role: 'user',
            content: [
              `Lead name: ${name}`,
              company ? `Company: ${company}` : '',
              message ? `Their message/interest: ${message}` : 'They submitted an interest form.',
              source ? `Source: ${source}` : '',
              calendlyUrl ? `Calendar link: ${calendlyUrl}` : '',
              `Sign off as: ${founderName}, ${companyName}`,
            ].filter(Boolean).join('\n'),
          },
        ],
        { maxTokens: 200, temperature: 0.6 },
      )).trim()
    } catch {
      // AI unavailable — fall through to fallback template
    }

    // Fallback template if AI fails
    if (!responseEmail) {
      responseEmail = `Hi ${name},\n\nThanks for reaching out to ${companyName}! We're excited to connect with you${company ? ` and the ${company} team` : ''}.\n\n${message ? `I saw your note about "${message}" — let's chat about how we can help.` : "I'd love to learn more about what you're working on and how we might be able to help."}\n\n${calendlyUrl ? `You can book a quick 20-minute call here: ${calendlyUrl}` : 'Feel free to reply to this email and we can set up a time to chat.'}\n\nLooking forward to connecting,\n${founderName}\n${companyName}`
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      // Log but don't fail
      try {
        await adminClient.from('agent_activity').insert({
          user_id: uid,
          agent_id: 'susi',
          action_type: 'inbound_lead',
          description: `Inbound lead from ${name}${company ? ` (${company})` : ''} — email not sent (no Resend key)`,
          metadata: { name, email, company, message, source },
        })
      } catch { /* non-critical */ }
      return NextResponse.json({ received: true, emailSent: false })
    }

    // Send response to lead
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${founderName} at ${companyName} <no-reply@edgealpha.ai>`,
        to: [email],
        reply_to: founderEmail,
        subject: `Re: Your interest in ${companyName}`,
        text: responseEmail,
      }),
    })

    // Notify founder about new lead
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Susi via Edge Alpha <no-reply@edgealpha.ai>`,
        to: [founderEmail],
        subject: `🎯 New inbound lead: ${name}${company ? ` (${company})` : ''}`,
        html: `<p><strong>Susi auto-responded to a new lead within 60 seconds.</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:500px;font-family:system-ui,sans-serif;font-size:14px">
  <tr><td style="padding:8px 12px;background:#F9F7F2;font-weight:600;color:#8A867C">Name</td><td style="padding:8px 12px;border-bottom:1px solid #E2DDD5">${name}</td></tr>
  <tr><td style="padding:8px 12px;background:#F9F7F2;font-weight:600;color:#8A867C">Email</td><td style="padding:8px 12px;border-bottom:1px solid #E2DDD5"><a href="mailto:${email}">${email}</a></td></tr>
  ${company ? `<tr><td style="padding:8px 12px;background:#F9F7F2;font-weight:600;color:#8A867C">Company</td><td style="padding:8px 12px;border-bottom:1px solid #E2DDD5">${company}</td></tr>` : ''}
  ${message ? `<tr><td style="padding:8px 12px;background:#F9F7F2;font-weight:600;color:#8A867C">Message</td><td style="padding:8px 12px;border-bottom:1px solid #E2DDD5">${message}</td></tr>` : ''}
  ${source ? `<tr><td style="padding:8px 12px;background:#F9F7F2;font-weight:600;color:#8A867C">Source</td><td style="padding:8px 12px">${source}</td></tr>` : ''}
</table>
<p style="margin-top:20px;font-size:13px;color:#8A867C"><strong>Response sent to ${email}:</strong></p>
<blockquote style="border-left:3px solid #2563EB;padding:12px 16px;background:#F0F6FF;font-size:13px;color:#374151;white-space:pre-wrap;font-family:inherit">${responseEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</blockquote>`,
      }),
    }).catch(() => {})

    // Log to agent_activity + deals table
    try {
      await Promise.all([
        adminClient.from('agent_activity').insert({
          user_id: uid,
          agent_id: 'susi',
          action_type: 'inbound_lead',
          description: `Inbound lead from ${name}${company ? ` (${company})` : ''} — auto-responded in <60s`,
          metadata: { name, email, company, message, source, emailSent: sendRes.ok },
        }),
        adminClient.from('deals').insert({
          user_id: uid,
          company: company || name,
          contact_name: name,
          contact_email: email,
          stage: 'lead',
          notes: message || `Inbound lead via webhook (${source || 'unknown source'})`,
          next_action_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'inbound_webhook',
        }),
      ])
    } catch { /* non-critical */ }

    return NextResponse.json({ received: true, emailSent: sendRes.ok })
  } catch (err) {
    console.error('Susi lead webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET — return the founder's webhook URL (for display in Susi agent UI)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    usage: {
      method: 'POST',
      url: `${request.nextUrl.origin}/api/webhook/lead?uid=YOUR_USER_ID`,
      body: { name: 'string', email: 'string', company: 'string?', message: 'string?', phone: 'string?', source: 'string?' },
      description: 'Susi auto-responds to leads within 60 seconds and adds them to your pipeline.',
    },
  })
}
