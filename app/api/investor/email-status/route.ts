import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// GET /api/investor/email-status
// Returns { emailConfirmed: boolean, canResend: boolean }
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('investor_profiles')
      .select('email_confirmed_at, email_confirm_token')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (error) {
      log.error('GET /api/investor/email-status:', error)
      return NextResponse.json({ emailConfirmed: true })
    }

    if (!data) return NextResponse.json({ emailConfirmed: true })

    return NextResponse.json({
      emailConfirmed: !!data.email_confirmed_at,
      canResend:      !!data.email_confirm_token,
    })
  } catch (err) {
    log.error('GET /api/investor/email-status unexpected:', err)
    return NextResponse.json({ emailConfirmed: true })
  }
}
