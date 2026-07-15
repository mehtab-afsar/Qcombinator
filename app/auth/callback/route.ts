import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeAndConfirmEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'
import { FOUNDER_PLAN_LIMITS } from '@/lib/billing/plans'

// Handles the OAuth redirect from Google (and any other provider).
// Exchanges the code for a session, then routes the user by role.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    log.error('GET /auth/callback', { err: error })
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Honor explicit ?next= (only relative paths)
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Route by role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const { data: investorProfile } = await supabase
    .from('investor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (investorProfile) {
    return NextResponse.redirect(`${origin}/investor/dashboard`)
  }

  const { data: founderProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (founderProfile) {
    return NextResponse.redirect(`${origin}/founder/dashboard`)
  }

  // New OAuth user with no profile — create a minimal stub so they aren't orphaned
  // if they navigate away from onboarding. Full profile is completed in onboarding.
  try {
    const admin = createAdminClient()
    const fullName    = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Founder'
    const confirmToken = randomUUID()

    // Google verifies emails before OAuth — mark as confirmed immediately
    const now = new Date().toISOString()

    await Promise.all([
      admin.from('founder_profiles').insert({
        user_id:              user.id,
        full_name:            fullName,
        role:                 'founder',
        subscription_tier:    'free',
        onboarding_completed: false,
        registration_completed: false,
        profile_builder_completed: false,
        assessment_completed: false,
        email_confirmed_at:   now,       // Google emails are pre-verified
        email_confirm_token:  confirmToken,
      }).then(({ error: e }) => {
        if (e) log.error('[oauth-callback] founder_profiles stub insert failed:', e)
      }),

      admin.from('qscore_history').insert({
        user_id: user.id,
        overall_score: 0,
        data_source: 'registration',
      }).then(({ error: e }) => {
        if (e) log.error('[oauth-callback] qscore_history insert failed:', e)
      }),

      admin.from('subscription_usage').insert([
        { user_id: user.id, feature: 'agent_chat',          usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.agent_chat,          reset_at: getNextMonthDate() },
        { user_id: user.id, feature: 'qscore_recalc',       usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.qscore_recalc,       reset_at: getNextMonthDate() },
        { user_id: user.id, feature: 'investor_connection', usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.investor_connection, reset_at: getNextMonthDate() },
      ]).then(({ error: e }) => {
        if (e) log.error('[oauth-callback] subscription_usage insert failed:', e)
      }),
    ])

    // Send welcome email (no confirm link needed — Google already verified)
    if (user.email) {
      void sendWelcomeAndConfirmEmail({
        email:        user.email,
        fullName,
        startupName:  'Your Startup',
        confirmToken, // still include so they can click — will just find already-confirmed
      }).catch(e => log.warn('[oauth-callback] welcome email failed:', e))
    }
  } catch (e) {
    log.error('[oauth-callback] profile stub creation failed:', e)
    // Still redirect to onboarding — they can fill it in there
  }

  return NextResponse.redirect(`${origin}/founder/onboarding`)
}

function getNextMonthDate(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
}
