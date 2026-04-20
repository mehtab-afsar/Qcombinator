import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/messages?connectionId=<uuid>
// Returns messages for a given connection_request, oldest first.
// Marks unread messages (from the other party) as read on fetch.
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

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

    // User must be the founder or the investor on this connection
    const isParty = conn.founder_id === user.id || conn.investor_id === user.id
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch messages, oldest first
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, read_at, created_at')
      .eq('connection_request_id', connectionId)
      .order('created_at', { ascending: true })

    if (error) {
      log.error('GET /api/messages', { error })
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Mark messages sent to this user as read (fire-and-forget)
    const unread = (msgs ?? []).filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id)
    if (unread.length > 0) {
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread)
    }

    return NextResponse.json({ messages: msgs ?? [] })
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
      .select('id, founder_id, investor_id, status')
      .eq('id', connectionId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const isFounder  = conn.founder_id  === user.id
    const isInvestor = conn.investor_id === user.id
    if (!isFounder && !isInvestor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (conn.status !== 'meeting_scheduled') {
      return NextResponse.json({ error: 'Can only message within an accepted connection' }, { status: 400 })
    }

    const recipientId = isFounder ? conn.investor_id : conn.founder_id

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

    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (err) {
    log.error('POST /api/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
