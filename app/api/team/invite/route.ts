import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, emailSchema } from '@/lib/api/validate'
import { sendTeamInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

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

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    log.error('Team invite endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
