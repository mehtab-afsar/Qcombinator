/**
 * POST /api/investor/team/invite
 * Send a team invite for the investor's account (owner only).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, emailSchema } from '@/lib/api/validate'
import { sendInvestorTeamInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

const schema = z.object({
  email: emailSchema,
  role:  z.enum(['admin', 'analyst']),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(req, schema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { email, role } = parsed.data

    const admin = getAdminClient()

    // Verify caller is an investor
    const { data: invProfile } = await admin
      .from('investor_profiles')
      .select('user_id, full_name, firm_name')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!invProfile) return NextResponse.json({ error: 'Investor profile not found' }, { status: 403 })

    // Check caller is the owner (not an analyst themselves)
    const { data: existingMember } = await admin
      .from('investor_team_members')
      .select('role')
      .eq('investor_user_id', user.id)
      .eq('member_user_id', user.id)
      .maybeSingle()
    if (existingMember && existingMember.role === 'analyst') {
      return NextResponse.json({ error: 'Only the account owner can invite team members' }, { status: 403 })
    }

    const { data: invite, error: inviteErr } = await admin
      .from('investor_team_invites')
      .upsert(
        {
          investor_user_id: user.id,
          email:            email.toLowerCase(),
          role,
          invited_by:       user.id,
          expires_at:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at:      null,
        },
        { onConflict: 'investor_user_id,email', ignoreDuplicates: false }
      )
      .select('token')
      .single()

    if (inviteErr || !invite) {
      log.error('investor_team_invites upsert failed:', inviteErr)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Awaited, not fire-and-forget — the invitee has no account yet, so this email is the only
    // way they find out. A silent failure here used to report {ok:true} while nobody was ever
    // notified; the caller needs to know if it didn't actually go out.
    const emailSent = await sendInvestorTeamInviteEmail({
      toEmail:     email,
      token:       invite.token,
      firmName:    invProfile.firm_name ?? 'their fund',
      role,
      inviterName: invProfile.full_name ?? 'A team member',
    }).catch(e => {
      log.warn('investor team invite email failed:', e instanceof Error ? e.message : e)
      return false
    })

    return NextResponse.json({ ok: true, emailSent })
  } catch (err) {
    log.error('POST /api/investor/team/invite', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
