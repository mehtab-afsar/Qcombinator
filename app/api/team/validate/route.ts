/**
 * GET /api/team/validate?token=<hex>
 * Public — validates a team invite token and returns context for the join page.
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
      .from('team_invites')
      .select('startup_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
    }
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 })
    }

    const { data: startup } = await admin
      .from('startups')
      .select('name, owner_user_id')
      .eq('id', invite.startup_id)
      .single()

    const { data: ownerProfile } = await admin
      .from('founder_profiles')
      .select('full_name')
      .eq('user_id', startup?.owner_user_id ?? '')
      .maybeSingle()

    return NextResponse.json({
      valid:       true,
      type:        'team',
      startupName: startup?.name ?? 'your startup',
      inviterName: ownerProfile?.full_name ?? 'Your co-founder',
      role:        invite.role,
      email:       invite.email,
    })
  } catch (err) {
    log.error('GET /api/team/validate', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
