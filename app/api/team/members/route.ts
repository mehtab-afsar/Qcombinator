/**
 * GET    /api/team/members           — list workspace members + pending invites
 * PATCH  /api/team/members?userId=   — change a member's role (owner only)
 * DELETE /api/team/members?userId=   — remove a member (owner only)
 * DELETE /api/team/members?inviteId= — cancel a pending invite (owner or admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getMyTeamRole, canRemoveMember } from '@/lib/team/permissions'
import { log } from '@/lib/logger'
import type { TeamRole } from '@/lib/team/permissions'
import { z } from 'zod'

const patchSchema = z.object({ role: z.enum(['admin', 'member', 'viewer']) })

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = getAdminClient()
    const { role, startupId } = await getMyTeamRole(user.id, admin)
    if (!startupId) return NextResponse.json({ members: [], invites: [] })

    // Members — join with auth.users for email
    const { data: members } = await admin
      .from('startup_members')
      .select(`
        id, role, joined_at,
        founder_profiles!startup_members_user_id_fkey(full_name, user_id)
      `)
      .eq('startup_id', startupId)
      .order('joined_at', { ascending: true })

    // Pending invites (only if caller can invite)
    let invites: unknown[] = []
    if (role === 'owner' || role === 'admin') {
      const { data } = await admin
        .from('team_invites')
        .select('id, email, role, created_at, expires_at')
        .eq('startup_id', startupId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      invites = data ?? []
    }

    return NextResponse.json({ members: members ?? [], invites, myRole: role })
  } catch (err) {
    log.error('GET /api/team/members', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!targetUserId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    const { role: newRole } = parsed.data

    const admin = getAdminClient()
    const { role: callerRole, startupId } = await getMyTeamRole(user.id, admin)
    if (!startupId) return NextResponse.json({ error: 'No startup found' }, { status: 404 })
    if (callerRole !== 'owner') return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

    await admin
      .from('startup_members')
      .update({ role: newRole })
      .eq('startup_id', startupId)
      .eq('user_id', targetUserId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('PATCH /api/team/members', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const inviteId = req.nextUrl.searchParams.get('inviteId')
    if (inviteId) {
      // Cancel a pending invite
      const admin = getAdminClient()
      const { role: callerRole, startupId } = await getMyTeamRole(user.id, admin)
      if (!startupId) return NextResponse.json({ error: 'No startup found' }, { status: 404 })
      if (callerRole !== 'owner' && callerRole !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      await admin.from('team_invites').delete().eq('id', inviteId).eq('startup_id', startupId)
      return NextResponse.json({ ok: true })
    }

    const targetUserId = req.nextUrl.searchParams.get('userId')
    if (!targetUserId) return NextResponse.json({ error: 'userId or inviteId is required' }, { status: 400 })

    const admin = getAdminClient()
    const { role: callerRole, startupId } = await getMyTeamRole(user.id, admin)
    if (!startupId) return NextResponse.json({ error: 'No startup found' }, { status: 404 })

    // Get target role
    const { data: target } = await admin
      .from('startup_members')
      .select('role')
      .eq('startup_id', startupId)
      .eq('user_id', targetUserId)
      .maybeSingle()

    const isSelf = targetUserId === user.id

    if (!isSelf && (!callerRole || !canRemoveMember(callerRole, (target?.role ?? 'member') as TeamRole))) {
      return NextResponse.json({ error: 'Not authorized to remove this member' }, { status: 403 })
    }

    await admin
      .from('startup_members')
      .delete()
      .eq('startup_id', startupId)
      .eq('user_id', targetUserId)

    // If removing self, clear startup_id on their profile
    if (isSelf) {
      await admin.from('founder_profiles').update({ startup_id: null }).eq('user_id', targetUserId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/team/members', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
