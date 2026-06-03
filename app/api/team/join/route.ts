/**
 * POST /api/team/join
 * Accepts a team invite token for an already-authenticated user.
 * Used when an existing user clicks the invite link and is already logged in.
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
      .from('team_invites')
      .select('id, startup_id, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invite.accepted_at) return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

    // Add to workspace
    const { error: memberErr } = await admin
      .from('startup_members')
      .upsert(
        { startup_id: invite.startup_id, user_id: user.id, role: invite.role },
        { onConflict: 'startup_id,user_id', ignoreDuplicates: true }
      )
    if (memberErr) {
      log.error('startup_members upsert failed:', memberErr)
      return NextResponse.json({ error: 'Failed to join workspace' }, { status: 500 })
    }

    // Link founder_profile → startup
    await admin
      .from('founder_profiles')
      .update({ startup_id: invite.startup_id })
      .eq('user_id', user.id)

    // Mark invite accepted
    await admin
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ ok: true, startupId: invite.startup_id, role: invite.role })
  } catch (err) {
    log.error('POST /api/team/join', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
