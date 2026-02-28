import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// POST /api/survey/distribute
// Sends a survey invite email to a list of email addresses.
// Body: { surveyId, emails: string[], fromName?, fromEmail?, customMessage? }

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const body = await request.json()
    const { surveyId, emails, fromName, fromEmail, customMessage } = body as {
      surveyId: string
      emails: string[]
      fromName?: string
      fromEmail?: string
      customMessage?: string
    }

    if (!surveyId) return NextResponse.json({ error: 'surveyId is required' }, { status: 400 })
    if (!emails?.length) return NextResponse.json({ error: 'At least one email required' }, { status: 400 })
    if (emails.length > 100) return NextResponse.json({ error: 'Maximum 100 emails per batch' }, { status: 400 })

    // Validate emails
    const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).map(e => e.trim())
    if (validEmails.length === 0) return NextResponse.json({ error: 'No valid email addresses' }, { status: 400 })

    // Fetch founder profile for branding
    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const company    = (fp?.startup_name as string) || 'a product'
    const senderName = fromName || (fp?.full_name as string) || 'The team'

    // Build the survey URL
    const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'
    const surveyUrl  = `${baseUrl}/s/${surveyId}`

    const message = customMessage?.trim()
      || `We'd love to hear from you — it takes less than 3 minutes and directly shapes how we build ${escHtml(company)}.`

    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;color:#18160F">
        <h2 style="font-size:20px;font-weight:700;color:#18160F;margin:0 0 16px">Quick question from ${escHtml(company)} 🙏</h2>
        <p style="font-size:14px;color:#18160F;line-height:1.7;margin:0 0 20px">${escHtml(message)}</p>
        <a href="${surveyUrl}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;margin-bottom:28px">
          Take the survey →
        </a>
        <p style="font-size:12px;color:#8A867C;margin:0 0 4px">Takes less than 3 minutes · Your answers are anonymous</p>
        <p style="font-size:12px;color:#8A867C;margin:0">Or copy this link: <a href="${surveyUrl}" style="color:#2563EB">${surveyUrl}</a></p>
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #E2DDD5">
          <p style="font-size:12px;color:#8A867C;margin:0">${escHtml(senderName)} · ${escHtml(company)}</p>
        </div>
      </div>`

    const resend = new Resend(resendKey)
    const results: Array<{ email: string; status: 'sent' | 'failed' }> = []
    let sent = 0; let failed = 0

    // Send one at a time with a small delay to avoid rate limits
    for (const email of validEmails) {
      try {
        const { error } = await resend.emails.send({
          from:    `${senderName} <no-reply@edgealpha.ai>`,
          replyTo: fromEmail ? `${senderName} <${fromEmail}>` : undefined,
          to:      email,
          subject: `Quick question from ${company}`,
          html:    htmlBody,
        })
        if (error) { results.push({ email, status: 'failed' }); failed++ }
        else        { results.push({ email, status: 'sent'   }); sent++   }
        await new Promise(r => setTimeout(r, 150))
      } catch {
        results.push({ email, status: 'failed' })
        failed++
      }
    }

    // Log activity
    if (sent > 0) {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'nova',
        action_type: 'survey_distributed',
        description: `Survey distributed to ${sent} customer${sent !== 1 ? 's' : ''}`,
        metadata:    { surveyId, sent, failed, surveyUrl },
      })
    }

    return NextResponse.json({ sent, failed, results })
  } catch (err) {
    console.error('Survey distribute error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
