import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getMyTeamRole, canInviteMembers, canRemoveMember, type TeamRole } from '@/lib/team/founder-permissions'
import { log } from '@/lib/logger'
import { logTeamEvent } from '@/lib/team/audit'

export async function GET(_request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = getAdminClient()

    // Get founder profile to find startup_id
    const { data: profile, error: profileError } = await supabase
      .from('founder_profiles')
      .select('startup_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.startup_id) {
      return NextResponse.json({ members: [], invites: [], myRole: 'owner' }, { status: 200 })
    }

    const startupId = profile.startup_id

    // Get all members of the startup
    const { data: members, error: membersError } = await supabase
      .from('startup_members')
      .select(`
        id,
        role,
        joined_at,
        founder_profiles(
          user_id,
          full_name
        )
      `)
      .eq('startup_id', startupId)

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get pending invites
    const { data: invites, error: invitesError } = await supabase
      .from('team_invites')
      .select('id, email, role, created_at')
      .eq('startup_id', startupId)
      .is('accepted_at', null)

    if (invitesError) {
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    // Find current user's role
    const userMember = members?.find((m: { founder_profiles?: { user_id?: string }; role?: string }) => m.founder_profiles?.user_id === user.id)
    const myRole = userMember?.role || 'owner'

    return NextResponse.json({
      members: members || [],
      invites: invites || [],
      myRole,
    })
  } catch (error) {
    log.error('Team members endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function authenticate() {
  const auth = await verifyAuth()
  if (!auth.ok) {
    return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) } as const
  }
  const supabase = getAdminClient()
  const { role: myRole, startupId } = await getMyTeamRole(auth.user.id, supabase)
  if (!myRole || !startupId) {
    return { error: NextResponse.json({ error: 'No workspace found' }, { status: 400 }) } as const
  }
  return { supabase, user: auth.user, myRole, startupId } as const
}

/** Change a team member's role — owner/admin only, and never targets the owner. */
export async function PATCH(request: NextRequest) {
  const auth = await authenticate()
  if ('error' in auth) return auth.error
  const { supabase, user, myRole, startupId } = auth

  if (!canInviteMembers(myRole)) {
    return NextResponse.json({ error: 'Not authorized to change roles' }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const newRole = body.role
  if (!['admin', 'member', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error, count } = await supabase
    .from('startup_members')
    .update({ role: newRole })
    .eq('startup_id', startupId)
    .eq('user_id', userId)
    .neq('role', 'owner') // the owner's role can never be changed via this endpoint
    .select('id', { count: 'exact', head: true })

  if (error) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  logTeamEvent(supabase, {
    startupId, actorId: user.id, event: 'role_changed',
    targetUserId: userId, metadata: { toRole: newRole },
  })
  void supabase.from('notifications').insert({
    user_id:  userId,
    type:     'team_role_changed',
    title:    `Your team role changed to ${newRole}`,
    metadata: { startupId, changedBy: user.id },
  }).then(({ error: e }: { error: { message: string } | null }) => {
    if (e) log.error('[team-members] role-change notification insert failed:', e)
  })

  return NextResponse.json({ ok: true })
}

/** Remove a team member (?userId=) or cancel a pending invite (?inviteId=). */
export async function DELETE(request: NextRequest) {
  const auth = await authenticate()
  if ('error' in auth) return auth.error
  const { supabase, user, myRole, startupId } = auth

  const inviteId = request.nextUrl.searchParams.get('inviteId')
  if (inviteId) {
    if (!canInviteMembers(myRole)) {
      return NextResponse.json({ error: 'Not authorized to cancel invites' }, { status: 403 })
    }
    // Read the email before deleting — gone from the row once the delete succeeds.
    const { data: invite } = await supabase
      .from('team_invites').select('email').eq('id', inviteId).eq('startup_id', startupId).maybeSingle()
    const { error } = await supabase.from('team_invites').delete().eq('id', inviteId).eq('startup_id', startupId)
    if (error) return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 })
    logTeamEvent(supabase, {
      startupId, actorId: user.id, event: 'invite_cancelled', targetEmail: invite?.email,
    })
    return NextResponse.json({ ok: true })
  }

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId or inviteId is required' }, { status: 400 })

  const selfRemoval = userId === user.id
  if (!selfRemoval) {
    const { data: target } = await supabase
      .from('startup_members')
      .select('role')
      .eq('startup_id', startupId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!target || !canRemoveMember(myRole, target.role as TeamRole)) {
      return NextResponse.json({ error: 'Not authorized to remove this member' }, { status: 403 })
    }
  }

  const { error } = await supabase.from('startup_members').delete().eq('startup_id', startupId).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })

  logTeamEvent(supabase, {
    startupId, actorId: user.id, event: selfRemoval ? 'left' : 'removed', targetUserId: userId,
  })
  if (!selfRemoval) {
    void supabase.from('notifications').insert({
      user_id:  userId,
      type:     'team_member_removed',
      title:    `You were removed from the team`,
      metadata: { startupId, removedBy: user.id },
    }).then(({ error: e }: { error: { message: string } | null }) => {
      if (e) log.error('[team-members] removal notification insert failed:', e)
    })
  }

  return NextResponse.json({ ok: true })
}
