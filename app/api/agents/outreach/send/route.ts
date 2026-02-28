import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/outreach/send
// Personalizes and sends outreach emails to a list of contacts via Resend.
// Body: {
//   contacts: Array<{ name: string; email: string; company?: string; title?: string }>,
//   steps:    Array<{ subject: string; body: string }>,   // from outreach_sequence artifact
//   stepIndex: number,      // which step to send (0=first, 1=follow-up…)
//   fromName:  string,      // founder's name
//   fromEmail: string,      // founder's email (used as reply-to)
//   artifactId?: string,    // optional: link to the outreach_sequence artifact
//   sequenceName?: string,
// }
// Returns: { sent: number; failed: number; results: Array<{ email: string; status: 'sent'|'failed'; id?: string }> }

const PLATFORM_FROM = 'Edge Alpha <outreach@edgealpha.ai>'
const DELAY_MS = 200 // 200ms between sends to stay under Resend burst limits

interface Contact {
  name: string
  email: string
  company?: string
  title?: string
}

interface OutreachStep {
  subject: string
  body: string
}

// Merge {{firstName}}, {{lastName}}, {{company}}, {{title}} tokens into text
function personalize(text: string, contact: Contact): string {
  const firstName = contact.name.split(' ')[0] || contact.name
  const lastName  = contact.name.split(' ').slice(1).join(' ') || ''
  return text
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{lastName\}\}/gi, lastName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{fullName\}\}/gi, contact.name)
    .replace(/\{\{name\}\}/gi, contact.name)
    .replace(/\{\{company\}\}/gi, contact.company || 'your company')
    .replace(/\{\{title\}\}/gi, contact.title || 'your role')
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Convert plain text (may have \n) to HTML paragraphs
function textToHtml(text: string, fromName: string, _fromEmail: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;line-height:1.6;color:#18160F;font-size:15px">${escHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;color:#18160F">
      ${paragraphs}
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #E2DDD5">
        <p style="font-size:13px;color:#8A867C;margin:0">${escHtml(fromName)}</p>
        <p style="font-size:12px;color:#8A867C;margin:4px 0 0">Sent via <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a></p>
      </div>
    </div>
  `
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email sending not configured' }, { status: 503 })
    }

    const body = await request.json()
    const {
      contacts,
      steps,
      stepIndex = 0,
      fromName,
      fromEmail,
      artifactId,
      sequenceName,
    } = body as {
      contacts:     Contact[]
      steps:        OutreachStep[]
      stepIndex:    number
      fromName:     string
      fromEmail:    string
      artifactId?:  string
      sequenceName?: string
    }

    if (!contacts?.length || !steps?.length) {
      return NextResponse.json({ error: 'contacts and steps are required' }, { status: 400 })
    }
    if (contacts.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 contacts per send' }, { status: 400 })
    }

    const step = steps[stepIndex]
    if (!step) {
      return NextResponse.json({ error: `Step ${stepIndex} not found in sequence` }, { status: 400 })
    }

    const resend = new Resend(resendKey)
    const results: Array<{ email: string; status: 'sent' | 'failed'; resendId?: string; error?: string }> = []
    let sent = 0
    let failed = 0

    // Send emails one at a time with a small delay
    for (const contact of contacts) {
      try {
        const personalizedSubject = personalize(step.subject, contact)
        const personalizedBody    = personalize(step.body, contact)
        const htmlBody            = textToHtml(personalizedBody, fromName || 'The Founder', fromEmail)

        const { data, error } = await resend.emails.send({
          from:     PLATFORM_FROM,
          replyTo:  fromEmail ? `${fromName} <${fromEmail}>` : undefined,
          to:       contact.email,
          subject:  personalizedSubject,
          html:     htmlBody,
        })

        if (error) {
          results.push({ email: contact.email, status: 'failed', error: error.message })
          failed++
        } else {
          results.push({ email: contact.email, status: 'sent', resendId: data?.id })
          sent++

          // Log to outreach_sends
          await supabase.from('outreach_sends').insert({
            user_id:         user.id,
            artifact_id:     artifactId ?? null,
            sequence_name:   sequenceName ?? null,
            contact_email:   contact.email,
            contact_name:    contact.name,
            contact_company: contact.company ?? null,
            contact_title:   contact.title ?? null,
            step_index:      stepIndex,
            subject:         personalizedSubject,
            body_html:       htmlBody,
            resend_id:       data?.id ?? null,
            status:          'sent',
          })
        }

        // Rate-limit delay
        await sleep(DELAY_MS)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ email: contact.email, status: 'failed', error: msg })
        failed++
      }
    }

    // ── Cross-agent: auto-create lead deals in Susi's pipeline ──────────
    if (sent > 0) {
      const successContacts = results.filter(r => r.status === 'sent')
      const dealInserts = successContacts.map(r => {
        const contact = contacts.find(c => c.email === r.email)!
        return {
          user_id:       user.id,
          company:       contact.company || contact.name,
          contact_name:  contact.name,
          contact_email: contact.email,
          contact_title: contact.title ?? null,
          stage:         'lead',
          notes:         `Added from Patel outreach — "${sequenceName || 'Outreach Sequence'}" Step ${stepIndex + 1}`,
          source:        'patel_outreach',
        }
      })
      // Upsert — don't duplicate if contact already in pipeline
      if (dealInserts.length > 0) {
        await supabase.from('deals').upsert(dealInserts, {
          onConflict:      'user_id,contact_email',
          ignoreDuplicates: true,
        })
      }

      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'patel',
        action_type: 'send_outreach',
        description: `Sent ${sent} email${sent !== 1 ? 's' : ''} — Step ${stepIndex + 1} of "${sequenceName || 'Outreach Sequence'}" · ${sent} contact${sent !== 1 ? 's' : ''} added to Susi's pipeline`,
        metadata:    { sent, failed, step_index: stepIndex, sequence_name: sequenceName, pipeline_added: sent },
      })
    }

    return NextResponse.json({ sent, failed, results, pipelineAdded: sent })
  } catch (err) {
    console.error('Outreach send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/outreach/send?limit=20
// Returns recent outreach sends for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url    = new URL(request.url)
    const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)

    const { data, error } = await supabase
      .from('outreach_sends')
      .select('id, contact_email, contact_name, contact_company, step_index, subject, sent_at, status, sequence_name')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sends' }, { status: 500 })
    }

    // Aggregate stats
    const total  = data?.length ?? 0
    const opened = data?.filter(r => r.status === 'opened' || r.status === 'clicked' || r.status === 'replied').length ?? 0
    const replied = data?.filter(r => r.status === 'replied').length ?? 0

    return NextResponse.json({ sends: data ?? [], stats: { total, opened, replied } })
  } catch (err) {
    console.error('Outreach GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
