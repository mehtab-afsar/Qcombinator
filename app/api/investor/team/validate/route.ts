/**
 * GET /api/investor/team/validate?token=<hex>
 * Public — validates an investor team invite token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const admin = getAdminClient()

    const { data: invite, error } = await admin
      .from('investor_team_invites')
      .select('investor_user_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

    const { data: inviterProfile } = await admin
      .from('investor_profiles')
      .select('full_name, firm_name')
      .eq('user_id', invite.investor_user_id)
      .single()

    return NextResponse.json({
      valid:      true,
      firmName:   inviterProfile?.firm_name ?? 'the fund',
      inviterName:inviterProfile?.full_name ?? 'Your investor',
      role:       invite.role,
      email:      invite.email,
    })
  } catch (err) {
    log.error('GET /api/investor/team/validate', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
