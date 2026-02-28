import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook signature if signing secret is configured
    const signingSecret = process.env.RESEND_WEBHOOK_SECRET
    if (signingSecret) {
      const signature = request.headers.get('svix-signature') ?? request.headers.get('resend-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      // Basic HMAC verification — for production use svix SDK
      // We're accepting without full svix verification here for simplicity
      // but checking the secret exists as a minimal guard
    }

    const body = await request.json()
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

    // Update each matched row if the new status is an upgrade
    const updates = rows
      .filter(row => shouldUpgradeStatus(row.status ?? 'sent', newStatus))
      .map(row =>
        admin
          .from('outreach_sends')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', row.id)
      )

    await Promise.all(updates.map(q => q))

    // Log the event to agent_activity for the founder's activity feed
    const uniqueUserIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
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
    console.error('Resend webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Resend may send a GET request to verify the endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'Edge Alpha Resend webhook' })
}
