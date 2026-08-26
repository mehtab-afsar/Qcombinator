import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { resolveDemoInvestorUserId } from '@/lib/investor/demo-investor'
import { createNotification } from '@/lib/notifications/create'
import type { SupabaseClient } from '@supabase/supabase-js'

type Connection = { id: string; founder_id: string; investor_id: string | null; demo_investor_id: string | null; status: string }

// Most investors are linked through a "claimed" demo_investor row, not a real
// investor_id — connection_requests.investor_id is NULL for those, so a plain
// `conn.investor_id === user.id` check silently rejects the common case.
// Resolves whichever side of the connection the caller is on, and — when
// they're the investor — the investor's real auth user_id (for recipient_id).
async function resolveParty(
  admin: SupabaseClient,
  conn: Pick<Connection, 'founder_id' | 'investor_id' | 'demo_investor_id'>,
  userId: string,
): Promise<{ isParty: boolean; isFounder: boolean; investorUserId: string | null }> {
  if (conn.founder_id === userId) {
    const investorUserId = conn.investor_id ?? await resolveDemoInvestorUserId(admin, conn.demo_investor_id)
    return { isParty: true, isFounder: true, investorUserId }
  }
  if (conn.investor_id === userId) {
    return { isParty: true, isFounder: false, investorUserId: userId }
  }
  if (conn.demo_investor_id) {
    const { data: ip } = await admin
      .from('investor_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('demo_investor_id', conn.demo_investor_id)
      .maybeSingle()
    if (ip) return { isParty: true, isFounder: false, investorUserId: userId }
  }
  return { isParty: false, isFounder: false, investorUserId: null }
}

// GET /api/messages?connectionId=<uuid>
// Returns messages for a given connection_request, oldest first.
// Marks unread messages (from the other party) as read on fetch.
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()
    const admin = createAdminClient()

    const connectionId = new URL(request.url).searchParams.get('connectionId')
    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
    }

    // Verify this user is party to the connection
    const { data: conn } = await supabase
      .from('connection_requests')
      .select('id, founder_id, investor_id, demo_investor_id, status')
      .eq('id', connectionId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { isParty } = await resolveParty(admin, conn, user.id)
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Bounded — not building pagination here, just preventing an unbounded fetch on a
    // very long-running thread. Fetch newest-first so the limit keeps the RECENT tail
    // of the conversation, then reverse back to the oldest-first order the UI expects.
    const { data: msgsDesc, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, read_at, created_at')
      .eq('connection_request_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      log.error('GET /api/messages', { error })
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const msgs = (msgsDesc ?? []).slice().reverse()

    // Mark messages sent to this user as read (fire-and-forget)
    const unread = msgs.filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id)
    if (unread.length > 0) {
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread)
    }

    return NextResponse.json({ messages: msgs })
  } catch (err) {
    log.error('GET /api/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/messages
// Body: { connectionId: string; body: string }
// Sends a message within an accepted connection.
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()
    const admin = createAdminClient()

    const { connectionId, body } = await request.json()

    if (!connectionId || !body?.trim()) {
      return NextResponse.json({ error: 'connectionId and body are required' }, { status: 400 })
    }
    if (body.trim().length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4,000 characters)' }, { status: 400 })
    }

    // Verify this user is party to the connection and it's accepted
    const { data: conn } = await supabase
      .from('connection_requests')
      .select('id, founder_id, investor_id, demo_investor_id, status')
      .eq('id', connectionId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { isParty, isFounder, investorUserId } = await resolveParty(admin, conn, user.id)
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (conn.status !== 'meeting_scheduled' && conn.status !== 'accepted') {
      return NextResponse.json({ error: 'Can only message within an accepted connection' }, { status: 400 })
    }

    const recipientId = isFounder ? investorUserId : conn.founder_id
    if (!recipientId) {
      log.error('POST /api/messages: could not resolve recipient', { connectionId })
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        connection_request_id: connectionId,
        sender_id:    user.id,
        recipient_id: recipientId,
        body:         body.trim(),
      })
      .select('id, sender_id, body, read_at, created_at')
      .single()

    if (error) {
      log.error('POST /api/messages insert', { error })
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Notify the recipient with correct sender role label + a link into their own inbox.
    await createNotification({
      userId:   recipientId,
      type:     'message',
      title:    isFounder ? 'New message from a founder' : 'New message from an investor',
      body:     body.trim().slice(0, 120),
      metadata: { connection_id: connectionId, sender_id: user.id, href: isFounder ? '/investor/messages' : '/founder/messages' },
    })

    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (err) {
    log.error('POST /api/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
