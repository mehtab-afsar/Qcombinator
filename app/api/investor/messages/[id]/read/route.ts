import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// PATCH /api/investor/messages/[id]/read
// Marks all unread messages in a thread (connectionId = [id]) as read.
// [id] is the connection_request_id (thread identifier).
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const { id: connectionId } = await params
    const supabase = createAdminClient()

    // Verify this investor is party to the connection
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    const demoInvestorId = investorProfile?.demo_investor_id

    const { data: conn } = await supabase
      .from('connection_requests')
      .select('id, investor_id, demo_investor_id')
      .eq('id', connectionId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const isParty =
      conn.investor_id === user.id ||
      (demoInvestorId && conn.demo_investor_id === demoInvestorId)
    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark all messages in this thread sent to this investor as read
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('connection_request_id', connectionId)
      .eq('recipient_id', user.id)
      .is('read_at', null)

    if (error) {
      log.error('PATCH /api/investor/messages/[id]/read', { error })
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('PATCH /api/investor/messages/[id]/read', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
