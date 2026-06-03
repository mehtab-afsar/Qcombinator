import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

/**
 * GET /api/messages/unread
 * Returns { unreadMessages, pendingConnections, total } for the authenticated founder.
 * Mirrors the shape of GET /api/investor/messages/unread so the sidebar badge
 * can use the same component on both sides.
 */
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

    // Count unread messages where this founder is the recipient
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null)

    // Count pending connection requests sent to this founder's connections
    // (founder_id = user.id, status = 'pending' means investor hasn't approved yet —
    //  but for founders the interesting count is connections awaiting acceptance)
    const { count: pendingConnections } = await supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('founder_id', user.id)
      .eq('status', 'pending')

    const unread  = unreadMessages    ?? 0
    const pending = pendingConnections ?? 0

    return NextResponse.json({
      unreadMessages:     unread,
      pendingConnections: pending,
      total:              unread + pending,
    })
  } catch (err) {
    log.error('GET /api/messages/unread', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
