/**
 * POST /api/team/invite
 * Send a team invite email and create a pending team_invites row.
 * Requires: owner or admin role.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getMyTeamRole, canInviteMembers } from '@/lib/team/permissions'
import { sendTeamInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

const schema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'member', 'viewer']),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const { email, role } = parsed.data

    const admin = getAdminClient()
    const { role: callerRole, startupId } = await getMyTeamRole(user.id, admin)

    if (!startupId) return NextResponse.json({ error: 'No startup found' }, { status: 404 })
    if (!callerRole || !canInviteMembers(callerRole)) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('startup_members')
      .select('id')
      .eq('startup_id', startupId)
      .eq('user_id', (await admin.from('founder_profiles').select('user_id').eq('user_id', email).maybeSingle())?.data?.user_id ?? '')
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'User is already a team member' }, { status: 409 })

    // Upsert invite (resend = new token + reset expiry)
    const { data: invite, error: inviteErr } = await admin
      .from('team_invites')
      .upsert(
        {
          startup_id:  startupId,
          email:       email.toLowerCase(),
          role,
          invited_by:  user.id,
          token:       undefined, // let DB default generate new token
          expires_at:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: null,
        },
        { onConflict: 'startup_id,email', ignoreDuplicates: false }
      )
      .select('token, startup_id')
      .single()

    if (inviteErr || !invite) {
      log.error('team invite upsert failed:', inviteErr)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Fetch startup name for email
    const { data: startup } = await admin
      .from('startups')
      .select('name')
      .eq('id', startupId)
      .single()

    const { data: inviterProfile } = await admin
      .from('founder_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    void sendTeamInviteEmail({
      toEmail:     email,
      inviterName: inviterProfile?.full_name ?? 'Your co-founder',
      startupName: startup?.name ?? 'your startup',
      role,
      token:       invite.token,
    }).catch(e => log.warn('team invite email failed:', e instanceof Error ? e.message : e))

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('POST /api/team/invite', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
