import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { getMyDemoInvestorId } from '@/lib/investor/demo-investor'

// GET /api/investor/messages/unread
// Returns { unreadMessages: number, pendingRequests: number, total: number }
// Used by the sidebar badge to show combined unread count.

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

    // Count unread messages where this investor is the recipient
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null)

    // Count pending connection requests
    const demoInvestorId = await getMyDemoInvestorId(supabase, user.id)

    let pendingQuery = supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    pendingQuery = demoInvestorId
      ? pendingQuery.eq('demo_investor_id', demoInvestorId)
      : pendingQuery.eq('investor_id', user.id)

    const { count: pendingRequests } = await pendingQuery

    const unread  = unreadMessages  ?? 0
    const pending = pendingRequests ?? 0

    return NextResponse.json({
      unreadMessages:  unread,
      pendingRequests: pending,
      total:           unread + pending,
    })
  } catch (err) {
    log.error('GET /api/investor/messages/unread', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
