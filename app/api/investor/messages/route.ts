import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/messages
// Returns all message threads (accepted connections) for the authenticated investor,
// enriched with latest message + unread count per thread.
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    // Get investor's demo_investor_id for connection lookup
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    const demoInvestorId = investorProfile?.demo_investor_id

    // Fetch all accepted connections where this investor is a party
    const connOrFilter = demoInvestorId
      ? `demo_investor_id.eq.${demoInvestorId},investor_id.eq.${user.id}`
      : `investor_id.eq.${user.id}`

    const { data: connections, error: connErr } = await supabase
      .from('connection_requests')
      .select('id, founder_id, investor_id, status, created_at, updated_at')
      .or(connOrFilter)
      .in('status', ['meeting_scheduled', 'accepted'])
      .order('updated_at', { ascending: false })

    if (connErr) {
      log.error('GET /api/investor/messages connections', { connErr })
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ threads: [] })
    }

    const connectionIds = connections.map(c => c.id)
    const founderIds = [...new Set(connections.map(c => c.founder_id).filter(Boolean))]

    // Batch fetch: messages + founder profiles in parallel
    const [{ data: allMessages }, { data: founderProfiles }] = await Promise.all([
      supabase
        .from('messages')
        .select('id, connection_request_id, sender_id, body, read_at, created_at')
        .in('connection_request_id', connectionIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('founder_profiles')
        .select('user_id, full_name, startup_name, avatar_url')
        .in('user_id', founderIds),
    ])

    // Index profiles by founder user_id
    const profileMap = new Map<string, { full_name: string; startup_name: string; avatar_url: string | null }>()
    for (const p of founderProfiles ?? []) profileMap.set(p.user_id, p)

    // Group messages by connection_request_id
    const msgsByConnection = new Map<string, typeof allMessages>()
    for (const msg of allMessages ?? []) {
      const existing = msgsByConnection.get(msg.connection_request_id) ?? []
      existing.push(msg)
      msgsByConnection.set(msg.connection_request_id, existing)
    }

    const threads = connections.map(conn => {
      const msgs = msgsByConnection.get(conn.id) ?? []
      // msgs are sorted desc — first is latest
      const latestMessage = msgs[0] ?? null
      const unreadCount = msgs.filter(m => m.sender_id !== user.id && !m.read_at).length
      const founderProfile = profileMap.get(conn.founder_id)

      return {
        connectionId:  conn.id,
        founderId:     conn.founder_id,
        founderName:   founderProfile?.full_name   ?? 'Unknown Founder',
        startupName:   founderProfile?.startup_name ?? 'Unknown Startup',
        avatarUrl:     founderProfile?.avatar_url   ?? null,
        status:        conn.status,
        unreadCount,
        latestMessage: latestMessage
          ? {
              id:        latestMessage.id,
              body:      latestMessage.body,
              senderId:  latestMessage.sender_id,
              readAt:    latestMessage.read_at,
              createdAt: latestMessage.created_at,
            }
          : null,
        updatedAt: conn.updated_at,
      }
    })

    return NextResponse.json({ threads })
  } catch (err) {
    log.error('GET /api/investor/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/investor/messages
// Body: { connectionId: string; body: string }
// Sends a message to a founder within an accepted connection.
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    const { connectionId, body } = await request.json()

    if (!connectionId || !body?.trim()) {
      return NextResponse.json({ error: 'connectionId and body are required' }, { status: 400 })
    }
    if (body.trim().length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4,000 characters)' }, { status: 400 })
    }

    // Verify this investor is party to the connection and it's accepted
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    const demoInvestorId = investorProfile?.demo_investor_id

    const { data: conn } = await supabase
      .from('connection_requests')
      .select('id, founder_id, investor_id, demo_investor_id, status')
      .eq('id', connectionId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Check investor ownership via investor_id or demo_investor_id
    const isParty =
      conn.investor_id === user.id ||
      (demoInvestorId && conn.demo_investor_id === demoInvestorId)
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (conn.status !== 'meeting_scheduled' && conn.status !== 'accepted') {
      return NextResponse.json({ error: 'Can only message within an accepted connection' }, { status: 400 })
    }

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        connection_request_id: connectionId,
        sender_id:    user.id,
        recipient_id: conn.founder_id,
        body:         body.trim(),
      })
      .select('id, sender_id, body, read_at, created_at')
      .single()

    if (error) {
      log.error('POST /api/investor/messages insert', { error })
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Notify the founder (fire-and-forget)
    // fire-and-forget: in-app notification is non-critical; message insert already succeeded
    void Promise.resolve(supabase.from('notifications').insert({
      user_id:  conn.founder_id,
      type:     'message',
      title:    'New message from your investor',
      metadata: { connection_id: connectionId, sender_id: user.id },
    })).catch(() => {})

    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (err) {
    log.error('POST /api/investor/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
