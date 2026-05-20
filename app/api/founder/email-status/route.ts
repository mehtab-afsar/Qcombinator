import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// GET /api/founder/email-status
// Returns { emailConfirmed: boolean, canResend: boolean }
// Used by the sidebar banner to decide whether to show the confirm prompt.
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('founder_profiles')
      .select('email_confirmed_at, email_confirm_token')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (error) {
      log.error('GET /api/founder/email-status:', error)
      return NextResponse.json({ emailConfirmed: true }) // fail-open: don't nag on error
    }

    // If no profile row (investor or edge case), treat as confirmed so the banner never fires
    if (!data) return NextResponse.json({ emailConfirmed: true })

    return NextResponse.json({
      emailConfirmed: !!data.email_confirmed_at,
      canResend:      !!data.email_confirm_token,
    })
  } catch (err) {
    log.error('GET /api/founder/email-status unexpected:', err)
    return NextResponse.json({ emailConfirmed: true })
  }
}
