import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// DELETE /api/investor/messages/[id]
// Deletes all messages in a thread (connectionId = [id]) sent by this investor.
// Note: the messages table has RLS delete not explicitly granted — this uses the
// admin client, but we validate ownership before proceeding.
export async function DELETE(
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

    // Delete only messages sent by this investor (sender_id = user.id)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('connection_request_id', connectionId)
      .eq('sender_id', user.id)

    if (error) {
      log.error('DELETE /api/investor/messages/[id]', { error })
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('DELETE /api/investor/messages/[id]', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
