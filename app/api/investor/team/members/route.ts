/**
 * GET  /api/investor/team/members  — list investor team members + pending invites
 * DELETE /api/investor/team/members?userId=<id>  — remove a member
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = getAdminClient()

    // Resolve the investor_user_id — could be the owner or a member looking up their owner
    const { data: ownMembership } = await admin
      .from('investor_team_members')
      .select('investor_user_id, role')
      .eq('member_user_id', user.id)
      .maybeSingle()

    const investorUserId = ownMembership?.investor_user_id ?? user.id
    const isOwner        = !ownMembership || ownMembership.investor_user_id === user.id

    const { data: members } = await admin
      .from('investor_team_members')
      .select('id, role, joined_at, member_user_id, investor_profiles!investor_team_members_member_user_id_fkey(full_name)')
      .eq('investor_user_id', investorUserId)
      .order('joined_at', { ascending: true })

    let invites: unknown[] = []
    if (isOwner) {
      const { data } = await admin
        .from('investor_team_invites')
        .select('id, email, role, created_at')
        .eq('investor_user_id', investorUserId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      invites = data ?? []
    }

    return NextResponse.json({ members: members ?? [], invites, isOwner })
  } catch (err) {
    log.error('GET /api/investor/team/members', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!targetUserId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const admin = getAdminClient()

    const { data: invProfile } = await admin
      .from('investor_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!invProfile) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    await admin
      .from('investor_team_members')
      .delete()
      .eq('investor_user_id', user.id)
      .eq('member_user_id', targetUserId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/investor/team/members', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
