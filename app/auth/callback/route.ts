import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'
import { FOUNDER_PLAN_LIMITS, getNextMonthDate } from '@/lib/billing/plans'

// Handles the OAuth redirect from Google (and any other provider).
// Exchanges the code for a session, then routes the user by role.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null
  // Set by the investor onboarding page's own Google button (founder onboarding sends none) —
  // the only signal this route has for which wizard a brand-new sign-up actually came from.
  // Ignored once a profile of either kind already exists; only decides the NEW-user branch below.
  const intent = searchParams.get('intent')
  // Set by the founder onboarding page's Google button when it was reached via a team invite
  // link (app/founder/join/page.tsx → ?teamToken= carried through the OAuth redirect). Only
  // decides the NEW-user branch below, same as intent — an existing account clicking a team
  // invite goes through /api/team/join instead (app/founder/join/page.tsx's logged-in path).
  const teamToken = searchParams.get('teamToken')

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

  // Dual-role is a supported case (app/api/investor/onboarding/route.ts, middleware.ts both gate
  // each side purely on whether that side's own profile row exists) — e.g. a founder who also
  // angel-invests. So intent=investor must win here even for a user who already has a
  // founder_profiles row: it's a real, explicit signal from the investor onboarding page's own
  // Google button that this sign-in is for the investor side, not a stale/incidental session.
  // investor_profiles is never stubbed (unlike founder_profiles): the whole row is written once,
  // complete, at the end of the onboarding wizard (POST /api/investor/onboarding) — nothing to
  // insert here, just point them at the right wizard.
  if (intent === 'investor') {
    if (user.email) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0]
      void sendWelcomeEmail({
        email:        user.email,
        fullName,
        startupName:  'Edge Alpha Investor', // matches /api/auth/investor-signup's placeholder
      }).catch(e => log.warn('[oauth-callback] investor welcome email failed:', e))
    }
    return NextResponse.redirect(`${origin}/investor/onboarding`)
  }

  const { data: founderProfile } = await supabase
    .from('founder_profiles')
    .select('id, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (founderProfile) {
    // A row existing is not the same as onboarding being done — the stub this route creates
    // below (for a brand-new sign-up) has onboarding_completed: false, and used to be enough
    // on its own to route straight to the dashboard on any later callback (a repeat Google
    // sign-in, a session refresh, anything that re-hits this route).
    return NextResponse.redirect(
      `${origin}${founderProfile.onboarding_completed ? '/founder/dashboard' : '/founder/onboarding'}`
    )
  }

  // New OAuth user with no profile — create a minimal stub so they aren't orphaned
  // if they navigate away from onboarding. Full profile is completed in onboarding.
  try {
    const admin = createAdminClient()
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Founder'

    // No email_confirmed_at stamping needed here — Supabase already marks a Google sign-in's
    // email confirmed natively on the auth.users row (Google verifies it before OAuth even
    // reaches us), which is what lib/auth/email-confirmed.ts and middleware.ts's gate read.
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

    // Every founder gets their own workspace, same as app/api/auth/signup/route.ts's
    // email/password path — without this, getAnchorFounderId (lib/team/founder-permissions.ts)
    // has no startup_id to resolve, and every team-shared read (Mandate, Assets, Rhythm,
    // Actions, Q-Score, Briefings) 400s with "No workspace found" for every Google sign-up.
    // Runs after the founder_profiles insert above, not in the same Promise.all — the
    // founder_profiles.startup_id update below needs that row to already exist.
    // Skipped when joining someone else's via teamToken (handled just below) — same reasoning
    // as app/api/auth/signup/route.ts: a founder should only own one workspace.
    if (!teamToken) {
      try {
        const { data: startup, error: startupError } = await admin
          .from('startups')
          .insert({ name: 'Untitled Startup', owner_user_id: user.id })
          .select('id')
          .single()
        if (startupError) {
          log.error('[oauth-callback] startup workspace creation failed:', startupError)
        } else {
          await Promise.all([
            admin.from('startup_members').insert({ startup_id: startup.id, user_id: user.id, role: 'owner' })
              .then(({ error: e }) => { if (e) log.error('[oauth-callback] startup_members insert failed:', e) }),
            admin.from('founder_profiles').update({ startup_id: startup.id }).eq('user_id', user.id)
              .then(({ error: e }) => { if (e) log.error('[oauth-callback] founder_profiles.startup_id update failed:', e) }),
          ])
        }
      } catch (e) {
        log.error('[oauth-callback] startup workspace creation failed:', e)
      }
    } else {
      // Team invite signup via Google — join the inviter's workspace instead of creating a new
      // one. Same validation as app/api/auth/signup/route.ts's teamToken branch (not accepted,
      // not expired). Awaited here (that route's equivalent block is fire-and-forget) — this
      // founder's very next stop is /founder/onboarding, and middleware.ts's founder gate needs
      // startup_id resolvable the instant they land there, not racing a background write.
      try {
        const { data: invite } = await admin
          .from('team_invites')
          .select('id, startup_id, role, expires_at, accepted_at')
          .eq('token', teamToken)
          .maybeSingle()
        if (invite && !invite.accepted_at && new Date(invite.expires_at) > new Date()) {
          await Promise.all([
            admin.from('startup_members').upsert(
              { startup_id: invite.startup_id, user_id: user.id, role: invite.role },
              { onConflict: 'startup_id,user_id', ignoreDuplicates: true }
            ).then(({ error: e }) => { if (e) log.error('[oauth-callback] team invite startup_members upsert failed:', e) }),
            admin.from('founder_profiles').update({ startup_id: invite.startup_id }).eq('user_id', user.id)
              .then(({ error: e }) => { if (e) log.error('[oauth-callback] team invite founder_profiles.startup_id update failed:', e) }),
          ])
          await admin.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
        } else {
          log.warn('[oauth-callback] teamToken invalid, expired, or already used — no workspace joined', { userId: user.id })
        }
      } catch (e) {
        log.error('[oauth-callback] team invite auto-join failed:', e)
      }
    }

    // Send welcome email — no confirm link needed, Google already verified this address
    if (user.email) {
      void sendWelcomeEmail({
        email:        user.email,
        fullName,
        startupName:  'Your Startup',
      }).catch(e => log.warn('[oauth-callback] welcome email failed:', e))
    }
  } catch (e) {
    log.error('[oauth-callback] profile stub creation failed:', e)
    // Still redirect to onboarding — they can fill it in there
  }

  return NextResponse.redirect(`${origin}/founder/onboarding`)
}

