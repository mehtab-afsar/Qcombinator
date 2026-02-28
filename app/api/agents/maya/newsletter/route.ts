import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'
import { Resend } from 'resend'

// POST /api/agents/maya/newsletter
// Generates and sends a product newsletter to a subscriber list via Resend.
// Body: { subject?, topic, subscribers: string[], customMessage? }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const body = await request.json()
    const { topic, subscribers, customMessage, send = false } = body as {
      topic: string
      subscribers?: string[]
      customMessage?: string
      send?: boolean
    }

    if (!topic?.trim()) return NextResponse.json({ error: 'topic is required' }, { status: 400 })

    const admin = getAdmin()

    // Fetch brand voice + founder profile for tone consistency
    const [brandRes, fpRes] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, full_name, tagline').eq('user_id', user.id).single(),
    ])

    const brand = (brandRes.data?.content ?? {}) as Record<string, unknown>
    const fp    = fpRes.data
    const company   = fp?.startup_name ?? 'Your Company'
    const founder   = fp?.full_name ?? 'The Team'
    const voiceNote = (brand.toneOfVoice ?? brand.brandVoice) ? `Brand voice: ${brand.toneOfVoice ?? brand.brandVoice}` : ''

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Maya, a brand and content strategist. Write a product newsletter email.
${voiceNote}

Return ONLY valid JSON:
{
  "subject": "email subject line (compelling, specific, <60 chars)",
  "preheader": "preview text shown in inbox (50-90 chars)",
  "headline": "bold email headline (max 8 words)",
  "intro": "2-3 sentences — personal, warm opener from the founder",
  "sections": [
    {
      "heading": "section heading",
      "body": "2-3 sentences of content — useful, specific, not fluffy"
    }
  ],
  "cta": {
    "text": "button text (max 5 words)",
    "description": "1 sentence on what clicking does"
  },
  "signoff": "warm sign-off line"
}

Rules:
- Write like a founder, not a marketing department
- Be specific and useful — real insights, not vague promises
- 3 sections max — keep it scannable`,
        },
        { role: 'user', content: `Write a newsletter about: ${topic.trim()}\nCompany: ${company}${customMessage ? `\nExtra context: ${customMessage}` : ''}` },
      ],
      { maxTokens: 800, temperature: 0.55 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let nl: Record<string, unknown>
    try { nl = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { nl = m ? JSON.parse(m[0]) : {} } catch { nl = {} } }

    // Build HTML email
    const sections = ((nl.sections as {heading: string; body: string}[]) ?? [])
      .map(s => `
        <div style="margin-bottom:24px">
          <h2 style="font-size:14px;font-weight:700;color:#18160F;margin:0 0 8px">${esc(s.heading)}</h2>
          <p style="font-size:14px;color:#18160F;line-height:1.7;margin:0">${esc(s.body)}</p>
        </div>`).join('')

    const cta = nl.cta as { text: string; description: string } | undefined

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:48px 32px;color:#18160F">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8A867C;margin:0 0 20px">${esc(company)} · Newsletter</p>
        <h1 style="font-size:24px;font-weight:800;color:#18160F;margin:0 0 16px;line-height:1.2">${esc(String(nl.headline ?? topic))}</h1>
        <p style="font-size:14px;color:#18160F;line-height:1.7;margin:0 0 28px;border-bottom:1px solid #E2DDD5;padding-bottom:28px">${esc(String(nl.intro ?? ''))}</p>
        ${sections}
        ${cta ? `
        <div style="margin:28px 0">
          <a style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700">${esc(cta.text)}</a>
          <p style="font-size:12px;color:#8A867C;margin:8px 0 0">${esc(cta.description)}</p>
        </div>` : ''}
        <div style="border-top:1px solid #E2DDD5;padding-top:20px;margin-top:32px">
          <p style="font-size:13px;color:#18160F;margin:0 0 4px">${esc(String(nl.signoff ?? 'Thanks for reading'))}</p>
          <p style="font-size:13px;color:#8A867C;margin:0">${esc(founder)}, ${esc(company)}</p>
        </div>
        <p style="font-size:11px;color:#8A867C;margin:24px 0 0">You received this because you signed up for updates from ${esc(company)}.</p>
      </div>`

    const subject = String(nl.subject ?? topic)

    let sent = 0; let failed = 0
    const validSubs = (subscribers ?? []).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).map(e => e.trim())

    if (send && validSubs.length > 0) {
      const resend = new Resend(resendKey)
      for (const email of validSubs.slice(0, 100)) {
        try {
          const { error } = await resend.emails.send({
            from:    `${company} <no-reply@edgealpha.ai>`,
            to:      email,
            subject,
            html,
          })
          if (error) failed++; else sent++
          await new Promise(r => setTimeout(r, 120))
        } catch { failed++ }
      }
    }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'maya',
      action_type: 'newsletter_sent',
      description: `Newsletter "${subject}" ${send ? `sent to ${sent} subscriber${sent !== 1 ? 's' : ''}` : 'generated (not sent)'}`,
      metadata:    { topic, sent, failed, subscriberCount: validSubs.length },
    })

    return NextResponse.json({ newsletter: nl, html, subject, sent, failed })
  } catch (err) {
    console.error('Maya newsletter error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
