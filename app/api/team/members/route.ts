import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = getAdminClient()

    // Get user from token
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
      return NextResponse.json({ members: [], invites: [], myRole: 'owner' }, { status: 200 })
    }

    const startupId = profile.startup_id

    // Get all members of the startup
    const { data: members, error: membersError } = await supabase
      .from('startup_members')
      .select(`
        id,
        role,
        joined_at,
        founder_profiles(
          user_id,
          full_name
        )
      `)
      .eq('startup_id', startupId)

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get pending invites
    const { data: invites, error: invitesError } = await supabase
      .from('team_invites')
      .select('id, email, role, created_at')
      .eq('startup_id', startupId)
      .is('accepted_at', null)

    if (invitesError) {
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    // Find current user's role
    const userMember = members?.find((m: { founder_profiles?: { user_id?: string }; role?: string }) => m.founder_profiles?.user_id === user.id)
    const myRole = userMember?.role || 'owner'

    return NextResponse.json({
      members: members || [],
      invites: invites || [],
      myRole,
    })
  } catch (error) {
    console.error('Team members endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
