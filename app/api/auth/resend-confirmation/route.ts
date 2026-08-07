import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createClient } from '@/lib/supabase/server'
import { isEmailConfirmed } from '@/lib/auth/email-confirmed'
import { log } from '@/lib/logger'

// POST /api/auth/resend-confirmation
// Re-sends Supabase's own native confirmation email. Works for both founders and investors —
// it's keyed off the Supabase auth user, not a role-specific profile table, so one route now
// correctly serves both (the old hand-rolled version only ever looked up founder_profiles,
// which silently 404'd for every investor who clicked "resend").
export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    if (isEmailConfirmed(auth.user)) {
      return NextResponse.json({ error: 'Email already confirmed' }, { status: 400 })
    }

    if (!auth.user.email) {
      return NextResponse.json({ error: 'No email on this account' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email: auth.user.email })

    if (error) {
      log.warn('[resend-confirmation] Supabase resend failed:', error)
      return NextResponse.json(
        { error: error.message || 'Could not resend confirmation email' },
        { status: error.status ?? 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('[resend-confirmation] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
