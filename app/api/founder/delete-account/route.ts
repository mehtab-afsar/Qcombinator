import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { getMyTeamRole } from '@/lib/team/founder-permissions'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()

    // A team owner can't delete their account while other members depend on them — there's no
    // ownership-transfer feature yet, so doing so would permanently orphan the team (nobody
    // could ever manage billing or remove members again; the "owner can update/remove" RLS
    // policies on startups/startup_members require a role='owner' row that would never exist
    // again). Solo founders (no team, or a team of just themselves) delete normally below.
    const { role, startupId } = await getMyTeamRole(user.id, admin)
    if (role === 'owner' && startupId) {
      const { count } = await admin
        .from('startup_members')
        .select('id', { count: 'exact', head: true })
        .eq('startup_id', startupId)
        .neq('user_id', user.id)

      if ((count ?? 0) > 0) {
        return NextResponse.json({
          error: 'You own a team with other members. Remove them from your team, or contact support to transfer ownership, before deleting your account.',
        }, { status: 400 })
      }
    }

    // Delete the founder profile
    await admin.from('founder_profiles').delete().eq('user_id', user.id)

    // Delete the auth user (cascades to delete all related data via ON DELETE CASCADE)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('POST /api/founder/delete-account', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
