import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/update-password`,
    })

    if (error) {
      log.error('Password reset error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Always return success to avoid email enumeration
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('Password reset handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
