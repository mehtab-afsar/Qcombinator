import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'

// GET /api/auth/confirm-email?token=<uuid>
// Called from the link in the welcome email (both founders and investors).
// Validates the token against either founder_profiles or investor_profiles,
// sets email_confirmed_at, then redirects to the confirmation landing page.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=invalid`)
  }

  const admin = createAdminClient()

  // ── Check founder_profiles first ──────────────────────────────────────────
  const { data: founderProfile, error: founderErr } = await admin
    .from('founder_profiles')
    .select('user_id, email_confirmed_at')
    .eq('email_confirm_token', token)
    .maybeSingle()

  if (founderErr) {
    log.error('[confirm-email] founder lookup error:', founderErr)
    return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=error`)
  }

  if (founderProfile) {
    if (founderProfile.email_confirmed_at) {
      return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=already`)
    }
    const { error: updateErr } = await admin
      .from('founder_profiles')
      .update({ email_confirmed_at: new Date().toISOString(), email_confirm_token: null })
      .eq('user_id', founderProfile.user_id)

    if (updateErr) {
      log.error('[confirm-email] founder update error:', updateErr)
      return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=error`)
    }
    log.info('[confirm-email] founder confirmed:', { userId: founderProfile.user_id })
    return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=success`)
  }

  // ── Fallback: check investor_profiles ────────────────────────────────────
  const { data: investorProfile, error: investorErr } = await admin
    .from('investor_profiles')
    .select('user_id, email_confirmed_at')
    .eq('email_confirm_token', token)
    .maybeSingle()

  if (investorErr) {
    log.error('[confirm-email] investor lookup error:', investorErr)
    return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=error`)
  }

  if (investorProfile) {
    if (investorProfile.email_confirmed_at) {
      return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=already`)
    }
    const { error: updateErr } = await admin
      .from('investor_profiles')
      .update({ email_confirmed_at: new Date().toISOString(), email_confirm_token: null })
      .eq('user_id', investorProfile.user_id)

    if (updateErr) {
      log.error('[confirm-email] investor update error:', updateErr)
      return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=error`)
    }
    log.info('[confirm-email] investor confirmed:', { userId: investorProfile.user_id })
    return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=success`)
  }

  // Token not found in either table — invalid or already used
  return NextResponse.redirect(`${APP_URL}/auth/confirm-email?status=invalid`)
}
