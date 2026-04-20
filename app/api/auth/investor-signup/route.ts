import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseBody, investorSignupSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, investorSignupSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { email, password } = parsed.data

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'investor' },
    })

    if (authError || !authData.user) {
      const isDuplicate =
        authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists') ||
        authError?.status === 422
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Account created', userId: authData.user.id })
  } catch (err) {
    log.error('POST /api/auth/investor-signup', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
