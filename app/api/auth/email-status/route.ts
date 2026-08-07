import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { isEmailConfirmed } from '@/lib/auth/email-confirmed'
import { log } from '@/lib/logger'

// GET /api/auth/email-status
// One implementation for both founders and investors — confirmation status lives on the
// Supabase auth user (email_confirmed_at), not a role-specific profile table, so there's no
// role-specific lookup left to do (replaces the old /api/founder/email-status and
// /api/investor/email-status, which each queried their own profile table for the same fact).
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    return NextResponse.json({
      emailConfirmed: isEmailConfirmed(auth.user),
      email: auth.user.email ?? null,
    })
  } catch (err) {
    log.error('GET /api/auth/email-status unexpected:', err)
    return NextResponse.json({ error: 'Failed to check email status' }, { status: 500 })
  }
}
