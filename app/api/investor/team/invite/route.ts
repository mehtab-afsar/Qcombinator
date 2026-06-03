/**
 * POST /api/investor/team/invite
 * Send a team invite for the investor's account (owner only).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { APP_URL } from '@/lib/constants/app'
import { Resend } from 'resend'
import { APP_EMAIL_FROM } from '@/lib/constants/app'

const schema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'analyst']),
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

    // Send email
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend   = new Resend(resendKey)
      const joinUrl  = `${APP_URL}/investor/join?token=${invite.token}`
      const roleLabel = role === 'admin' ? 'Admin' : 'Analyst'
      void resend.emails.send({
        from:    APP_EMAIL_FROM,
        to:      email,
        subject: `${invProfile.full_name} invited you to join ${invProfile.firm_name ?? 'their fund'} on Edge Alpha`,
        html:    `<p>Hi,</p><p><strong>${invProfile.full_name}</strong> has invited you to join <strong>${invProfile.firm_name ?? 'their fund'}</strong> on Edge Alpha as <strong>${roleLabel}</strong>.</p><p><a href="${joinUrl}">Accept invite →</a></p><p>Link expires in 7 days.</p>`,
      }).catch(e => log.warn('investor team invite email failed:', e instanceof Error ? e.message : e))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('POST /api/investor/team/invite', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
