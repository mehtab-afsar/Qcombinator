import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

// POST /api/webhook/resend
// Receives Resend webhook events and updates outreach_sends tracking.
// Events handled: email.opened, email.clicked, email.delivered, email.bounced,
//                 email.complained, email.link_clicked
//
// Resend webhook docs: https://resend.com/docs/dashboard/webhooks/introduction
// Set the webhook URL in Resend dashboard to: https://yourdomain/api/webhook/resend

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Map Resend event types to our outreach_sends.status values
const EVENT_STATUS_MAP: Record<string, string> = {
  'email.delivered':     'delivered',
  'email.opened':        'opened',
  'email.link_clicked':  'clicked',
  'email.clicked':       'clicked',
  'email.bounced':       'bounced',
  'email.complained':    'complained',
  'email.delivery_delayed': 'delayed',
}

// Status priority (higher index = higher priority, only upgrade not downgrade)
const STATUS_PRIORITY = ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'complained']

function shouldUpgradeStatus(current: string, incoming: string): boolean {
  const currentIdx = STATUS_PRIORITY.indexOf(current)
  const incomingIdx = STATUS_PRIORITY.indexOf(incoming)
  // Always allow negative statuses (bounce/complaint) to override
  if (incoming === 'bounced' || incoming === 'complained') return true
  return incomingIdx > currentIdx
}

// Verify Svix-style HMAC-SHA256 signature used by Resend webhooks.
// Spec: https://docs.svix.com/receiving/verifying-payloads/how
async function verifySignature(
  rawBody: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const msgId        = headers.get('svix-id')
  const msgTimestamp = headers.get('svix-timestamp')
  const msgSignature = headers.get('svix-signature')

  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Reject timestamps older than 5 minutes (replay-attack guard)
  const ts = parseInt(msgTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  // Secret is prefixed "whsec_" + base64; strip prefix if present
  const base64Secret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const keyBytes = Uint8Array.from(atob(base64Secret), c => c.charCodeAt(0))

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
  const encoder = new TextEncoder()

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(toSign))
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))

  // svix-signature header may contain multiple "v1,<sig>" pairs separated by spaces
  return msgSignature.split(' ').some(part => {
    const sig = part.startsWith('v1,') ? part.slice(3) : part
    return sig === computed
  })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Verify the webhook signature if signing secret is configured
    const signingSecret = process.env.RESEND_WEBHOOK_SECRET
    if (signingSecret) {
      const valid = await verifySignature(rawBody, request.headers, signingSecret)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body as {
      type: string
      data: {
        email_id?: string
        to?: string[]
        subject?: string
        created_at?: string
        clicked_at?: string
        opened_at?: string
      }
    }

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const newStatus = EVENT_STATUS_MAP[type]
    if (!newStatus) {
      // Unhandled event type — acknowledge and ignore
      return NextResponse.json({ received: true, handled: false })
    }

    const resendId = data.email_id
    const toEmail  = data.to?.[0]

    if (!resendId && !toEmail) {
      return NextResponse.json({ error: 'No identifier in payload' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Find the outreach_send record by resend_id first, fall back to contact_email
    let query = admin.from('outreach_sends').select('id, status, user_id')
    if (resendId) {
      query = query.eq('resend_id', resendId)
    } else {
      query = query.eq('contact_email', toEmail)
    }
    const { data: rows, error: fetchErr } = await query.limit(5)

    if (fetchErr || !rows?.length) {
      // Could be an email we sent outside outreach (e.g. investor update) — silently ignore
      return NextResponse.json({ received: true, matched: false })
    }

    // Build timestamp/flag updates based on event type
    const timestampFields: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (type === 'email.opened')                                       timestampFields.opened_at    = data.opened_at ?? new Date().toISOString()
    if (type === 'email.link_clicked' || type === 'email.clicked')    timestampFields.clicked_at   = data.clicked_at ?? new Date().toISOString()
    if (type === 'email.bounced')                                      timestampFields.bounced      = true
    if (type === 'email.delivered')                                    timestampFields.delivered_at = data.created_at ?? new Date().toISOString()

    // Update each matched row if the new status is an upgrade
    const updates = rows
      .filter(row => shouldUpgradeStatus(row.status ?? 'sent', newStatus))
      .map(row =>
        admin
          .from('outreach_sends')
          .update({ status: newStatus, ...timestampFields })
          .eq('id', row.id)
      )

    await Promise.all(updates)

    // Recalculate outreach stats for affected users and update startup_state
    const uniqueUserIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
    await Promise.allSettled(uniqueUserIds.map(async (uid) => {
      const since = new Date(); since.setDate(since.getDate() - 30)
      const { data: stats } = await admin
        .from('outreach_sends')
        .select('status, bounced')
        .eq('user_id', uid)
        .gte('created_at', since.toISOString())
      if (!stats || stats.length === 0) return
      const total    = stats.length
      const opened   = stats.filter(s => ['opened','clicked','replied'].includes(s.status)).length
      const replied  = stats.filter(s => s.status === 'replied').length
      await admin.from('startup_state').upsert({
        user_id: uid,
        outreach_sent_count: total,
        outreach_open_rate:  Math.round((opened  / total) * 100),
        outreach_reply_rate: Math.round((replied / total) * 100),
        last_updated_by: 'patel',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }))

    // Log the event to agent_activity for the founder's activity feed
    const eventLabel: Record<string, string> = {
      'email.opened':       'opened your outreach email',
      'email.link_clicked': 'clicked a link in your outreach email',
      'email.clicked':      'clicked a link in your outreach email',
      'email.bounced':      'bounced (invalid email address)',
      'email.complained':   'marked your email as spam',
    }
    const label = eventLabel[type]
    if (label && uniqueUserIds.length > 0) {
      const activityInserts = uniqueUserIds.map(uid => ({
        user_id:     uid,
        agent_id:    'patel',
        action_type: `outreach_${newStatus}`,
        description: `${toEmail ?? 'A contact'} ${label}`,
        metadata:    { resend_id: resendId, email: toEmail, event_type: type },
      }))
      await admin.from('agent_activity').insert(activityInserts)
    }

    return NextResponse.json({ received: true, matched: true, newStatus, updated: updates.length })
  } catch (err) {
    log.error('Resend webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Resend may send a GET request to verify the endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'Edge Alpha Resend webhook' })
}
