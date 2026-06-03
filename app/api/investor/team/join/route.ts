/**
 * POST /api/investor/team/join
 * Accept an investor team invite for an already-authenticated investor user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

const schema = z.object({ token: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'token is required' }, { status: 400 })
    const { token } = parsed.data

    const admin = getAdminClient()

    const { data: invite, error } = await admin
      .from('investor_team_invites')
      .select('id, investor_user_id, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invite.accepted_at) return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

    await admin.from('investor_team_members').upsert(
      { investor_user_id: invite.investor_user_id, member_user_id: user.id, role: invite.role, invited_by: invite.investor_user_id },
      { onConflict: 'investor_user_id,member_user_id', ignoreDuplicates: true }
    )

    await admin.from('investor_team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    return NextResponse.json({ ok: true, investorUserId: invite.investor_user_id, role: invite.role })
  } catch (err) {
    log.error('POST /api/investor/team/join', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
