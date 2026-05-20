import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { verifyAuth } from '@/lib/auth/verify'
import { createAdminClient } from '@/lib/supabase/server'
import { sendConfirmationOnlyEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

// POST /api/auth/resend-confirmation
// Issues a fresh token and re-sends the confirmation email.
// Rate-limited by Vercel middleware (5 req/min per IP).
export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const admin = createAdminClient()

    // Get current profile
    const { data: profile, error: fetchErr } = await admin
      .from('founder_profiles')
      .select('full_name, email_confirmed_at')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.email_confirmed_at) {
      return NextResponse.json({ error: 'Email already confirmed' }, { status: 400 })
    }

    const newToken = randomUUID()

    const { error: updateErr } = await admin
      .from('founder_profiles')
      .update({ email_confirm_token: newToken })
      .eq('user_id', auth.user.id)

    if (updateErr) {
      log.error('[resend-confirmation] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to generate new token' }, { status: 500 })
    }

    void sendConfirmationOnlyEmail({
      email:        auth.user.email!,
      fullName:     profile.full_name ?? 'Founder',
      confirmToken: newToken,
    }).catch(e => log.warn('[resend-confirmation] email failed:', e))

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('[resend-confirmation] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
