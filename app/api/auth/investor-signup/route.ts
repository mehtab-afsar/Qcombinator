import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users.find(u => u.email === email)
    if (existing) {
      // Check if they already have an investor profile
      const { data: profile } = await supabaseAdmin
        .from('investor_profiles')
        .select('id')
        .eq('user_id', existing.id)
        .single()
      if (profile) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      // Orphaned user — delete and recreate
      await supabaseAdmin.auth.admin.deleteUser(existing.id)
    }

    // Create the user (auto-confirms email so no verification step needed in demo)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'investor' },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Account created', userId: authData.user.id })
  } catch (err) {
    console.error('Investor signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
