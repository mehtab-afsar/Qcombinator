import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

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
      console.error('Invite creation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // TODO: Send email with invite link
    // await sendTeamInviteEmail({
    //   to: email,
    //   token: inviteToken,
    //   companyName: profile.company_name,
    //   role: role,
    //   invitedBy: user.user_metadata?.full_name || user.email
    // })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    console.error('Team invite endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
