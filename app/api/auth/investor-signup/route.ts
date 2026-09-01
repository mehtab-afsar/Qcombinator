import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { parseBody, investorSignupSchema } from '@/lib/api/validate'
import { sendWelcomeEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'
import { signupAllowed, SIGNUP_CLOSED_MESSAGE } from '@/lib/auth/signup-access'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, investorSignupSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { email, password } = parsed.data

    // Pre-launch gate (lib/auth/signup-access.ts) — checked BEFORE any account is created,
    // and failing closed.
    if (!(await signupAllowed(email))) {
      log.warn('signup refused — pre-launch gate', { domain: email.split('@')[1] ?? 'unknown' })
      return NextResponse.json({ error: SIGNUP_CLOSED_MESSAGE }, { status: 403 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')

    const supabaseAdmin = getAdminClient()

    // email_confirm is omitted (defaults to false) — Supabase sends its own confirmation email
    // and the account stays unconfirmed until that link is clicked. middleware.ts blocks
    // /investor/** until then (lib/auth/email-confirmed.ts).
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role: 'investor',
      },
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

    // Fire-and-forget welcome email. Supabase sends the confirmation link itself, separately.
    void sendWelcomeEmail({
      email,
      fullName:    email.split('@')[0],  // investor full name filled in during onboarding
      startupName: 'Edge Alpha Investor', // placeholder until onboarding completes
    }).catch(e => log.warn('[investor-signup] welcome email failed:', e instanceof Error ? e.message : e))

    return NextResponse.json({ message: 'Account created', userId: authData.user.id })
  } catch (err) {
    log.error('POST /api/auth/investor-signup', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
