import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/messages/unread
// Returns { unreadMessages: number, pendingRequests: number, total: number }
// Used by the sidebar badge to show combined unread count.

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count unread messages where this investor is the recipient
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null)

    // Count pending connection requests
    // First get demo_investor_id if any
    const { data: profile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    let pendingQuery = supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    pendingQuery = profile?.demo_investor_id
      ? pendingQuery.eq('demo_investor_id', profile.demo_investor_id)
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
    console.error('Unread messages count error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
