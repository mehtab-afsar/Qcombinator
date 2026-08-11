import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, emailSchema } from '@/lib/api/validate'
import { sendTeamInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'
import { getCallerTeamRole, canInviteMembers } from '@/lib/team/founder-permissions'
import { logTeamEvent } from '@/lib/team/audit'
import { FOUNDER_SEAT_LIMITS, type FounderTier } from '@/lib/billing/plans'

const schema = z.object({
  email: emailSchema,
  role:  z.enum(['admin', 'member', 'viewer']).default('member'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, schema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { email, role } = parsed.data

    const supabase = getAdminClient()

    // Get founder profile to find startup_id
    const { data: profile, error: profileError } = await supabase
      .from('founder_profiles')
      .select('startup_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.startup_id) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const startupId = profile.startup_id

    // Role check — previously missing entirely, so any member/viewer could invite
    // someone in as admin. getAdminClient() bypasses RLS, so this application-level
    // check is the only gate that exists for this route.
    const callerRole = await getCallerTeamRole(user.id, startupId, supabase)
    if (!callerRole || !canInviteMembers(callerRole)) {
      return NextResponse.json({ error: 'Not authorized to invite team members' }, { status: 403 })
    }

    // Seat limit — a live headcount, not a subscription_usage metered feature (see
    // FOUNDER_SEAT_LIMITS' own doc comment). Counts CURRENT members only; pending invites
    // don't consume a seat until accepted, matching how the eventual member count is what
    // actually gets billed. Resolved against the OWNER's subscription, not the caller's — an
    // inviting admin has no billing plan of their own for this workspace; the workspace's
    // plan is whatever the owner is paying for.
    const { data: startupRow } = await supabase
      .from('startups')
      .select('owner_user_id')
      .eq('id', startupId)
      .maybeSingle()
    const { data: ownerProfile } = startupRow?.owner_user_id
      ? await supabase
          .from('founder_profiles')
          .select('subscription_tier')
          .eq('user_id', startupRow.owner_user_id)
          .maybeSingle()
      : { data: null }
    const tier = ((ownerProfile?.subscription_tier as FounderTier | undefined) ?? 'free')
    const { count: memberCount } = await supabase
      .from('startup_members')
      .select('id', { count: 'exact', head: true })
      .eq('startup_id', startupId)
    if ((memberCount ?? 0) >= FOUNDER_SEAT_LIMITS[tier]) {
      return NextResponse.json({ error: `Seat limit reached for your plan (${FOUNDER_SEAT_LIMITS[tier]} members)` }, { status: 403 })
    }

    // Generate invite token
    const inviteToken = randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        startup_id: startupId,
        email: email.toLowerCase(),
        role,
        token: inviteToken,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (inviteError) {
      log.error('Invite creation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    void sendTeamInviteEmail({
      toEmail:     email,
      token:       inviteToken,
      startupName: String(user.user_metadata?.startup_name ?? user.user_metadata?.full_name ?? 'Your team'),
      role,
      inviterName: String(user.user_metadata?.full_name ?? user.email ?? 'A team member'),
    }).catch((err: unknown) => log.error('[team-invite] email failed:', err))

    logTeamEvent(supabase, {
      startupId, actorId: user.id, event: 'invited',
      targetEmail: email.toLowerCase(), metadata: { role },
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    log.error('Team invite endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
