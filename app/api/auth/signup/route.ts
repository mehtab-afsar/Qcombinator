import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { parseBody, signupSchema } from '@/lib/api/validate';
import { log } from '@/lib/logger'
import { signupAllowed, SIGNUP_CLOSED_MESSAGE } from '@/lib/auth/signup-access'
import { sendWelcomeEmail } from '@/lib/email/send'
import { FOUNDER_PLAN_LIMITS, getNextMonthDate } from '@/lib/billing/plans'
import { mapStage, mapIndustry, mapRevenue } from '@/features/founder/services/signup-mappings.service'
import { enrichOnboardingText, autoLinkPortfolioByEmail, notifyAndTrackSignup } from '@/features/founder/services/complete-onboarding.service'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, signupSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const {
      email, password, fullName,
      startupName, companyName, website, industry, stage,
      revenueStatus, fundingStatus, teamSize, founderName,
      teamToken, leverageCheckId,
      problemStatement, targetCustomer, location, tagline,
    } = parsed.data;


    // Pre-launch gate (lib/auth/signup-access.ts) — checked BEFORE any account is created, and
    // failing closed. A teamToken is not an exemption: an invite joins the inviter's workspace,
    // which is still an account coming into existence.
    if (!(await signupAllowed(email))) {
      log.warn('signup refused — pre-launch gate', { domain: email.split('@')[1] ?? 'unknown' })
      return NextResponse.json({ error: SIGNUP_CLOSED_MESSAGE }, { status: 403 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')

    const supabaseAdmin = getAdminClient();

    const dbStage    = mapStage(stage);
    const dbIndustry = mapIndustry(industry);
    const dbRevenue  = mapRevenue(revenueStatus);

    // email_confirm is omitted (defaults to false) — Supabase sends its own confirmation email
    // and the account stays unconfirmed until that link is clicked. middleware.ts blocks
    // /founder/** until then (lib/auth/email-confirmed.ts).
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        startup_name: startupName || companyName,
      },
    });

    if (authError) {
      log.error('Auth signup error:', authError);
      const isDuplicate =
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists') ||
        authError.status === 422;
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please login instead.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Use a unique startup_name to avoid the unique-constraint conflict when the same
    // company name was used in a previous signup (e.g. repeated test runs).
    const baseStartupName = companyName || startupName || null
    const uniqueStartupName = baseStartupName
      ? `${baseStartupName}-${authData.user.id.slice(0, 6)}`
      : null

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('founder_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        startup_name: uniqueStartupName,
        industry: dbIndustry,
        stage: dbStage,
        role: 'founder',
        subscription_tier: 'free',
        onboarding_completed: true,
        assessment_completed: false,
        company_name: companyName || startupName || null,
        website: website || null,
        revenue_status: dbRevenue,
        funding_status: fundingStatus || null,
        team_size: teamSize || null,
        founder_name: founderName || fullName,
        registration_completed: true,
        profile_builder_completed: false,
        tagline: tagline || null,
        location: location || null,
      })
      .select()
      .single();

    if (profileError) {
      log.error('Error creating founder profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch((e: unknown) =>
        log.error('Failed to rollback auth user after profile error:', e)
      );
      return NextResponse.json(
        { error: 'Account setup failed. Please try again.' },
        { status: 500 }
      );
    }

    const { error: qscoreErr } = await supabaseAdmin.from('qscore_history').insert({
      user_id: authData.user.id,
      overall_score: 0,
      data_source: 'registration',
    });
    if (qscoreErr) log.error('Failed to insert initial qscore row:', qscoreErr);

    // Insert usage limit rows — non-fatal: a failed insert logs but does not block signup.
    // The CHECK constraint on feature allows: agent_chat, investor_connection, qscore_recalc, workshop, agent_generate.
    const featureLimits = [
      { feature: 'agent_chat',           usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.agent_chat          },
      { feature: 'qscore_recalc',        usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.qscore_recalc       },
      { feature: 'investor_connection',  usage_count: 0, limit_count: FOUNDER_PLAN_LIMITS.free.investor_connection },
    ];
    const usageResults = await Promise.all(featureLimits.map(limit =>
      supabaseAdmin.from('subscription_usage').insert({
        user_id: authData.user.id,
        feature: limit.feature,
        usage_count: limit.usage_count,
        limit_count: limit.limit_count,
        reset_at: getNextMonthDate(),
      })
    ));
    const usageErr = usageResults.find(r => r.error)?.error;
    if (usageErr) {
      log.error('subscription_usage insert failed (non-fatal — user created successfully):', usageErr);
    }

    // Every new founder gets their own workspace by default, so Settings → Team has
    // a startup_id to attach invites to. Skipped when joining someone else's via
    // teamToken (handled just below) — a founder should only own one workspace.
    if (!teamToken) {
      const { data: startup, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert({
          name: baseStartupName ?? 'Untitled Startup',
          industry: dbIndustry,
          stage: dbStage,
          website: website || null,
          owner_user_id: authData.user.id,
        })
        .select('id')
        .single()

      if (startupError) {
        log.error('Failed to create startup workspace:', startupError)
      } else {
        await supabaseAdmin.from('startup_members').insert({
          startup_id: startup.id,
          user_id: authData.user.id,
          role: 'owner',
        })
        await supabaseAdmin
          .from('founder_profiles')
          .update({ startup_id: startup.id })
          .eq('user_id', authData.user.id)
      }
    }

    // Auto-join a team workspace if a teamToken was provided (invite link signup)
    if (teamToken) {
      void (async () => {
        try {
          const { data: invite } = await supabaseAdmin
            .from('team_invites')
            .select('id, startup_id, role, expires_at, accepted_at')
            .eq('token', teamToken)
            .maybeSingle()
          if (invite && !invite.accepted_at && new Date(invite.expires_at) > new Date()) {
            await supabaseAdmin.from('startup_members').upsert(
              { startup_id: invite.startup_id, user_id: authData.user.id, role: invite.role },
              { onConflict: 'startup_id,user_id', ignoreDuplicates: true }
            )
            await supabaseAdmin
              .from('founder_profiles')
              .update({ startup_id: invite.startup_id })
              .eq('user_id', authData.user.id)
            await supabaseAdmin
              .from('team_invites')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invite.id)
          }
        } catch (err) {
          log.warn('[signup] teamToken auto-join failed (non-fatal)', { err: (err as Error)?.message })
        }
      })()
    }

    // Link a converted signup back to its leverage-check submission, if it came from that
    // funnel. Never awaited, never fails signup — same non-blocking shape as teamToken above.
    if (leverageCheckId) {
      void (async () => {
        try {
          await supabaseAdmin
            .from('leverage_check_submissions')
            .update({ linked_founder_id: authData.user.id, linked_at: new Date().toISOString() })
            .eq('id', leverageCheckId)
        } catch (err) {
          log.warn('[signup] leverageCheckId link failed (non-fatal)', { err: (err as Error)?.message })
        }
      })()
    }

    // Fire-and-forget: clean + summarise onboarding text in background (~2–5s)
    void enrichOnboardingText(authData.user.id, problemStatement, targetCustomer, supabaseAdmin)

    // Fire-and-forget: auto-link to an investor who pre-added this email to their portfolio
    void autoLinkPortfolioByEmail(authData.user.id, email, profile.id, supabaseAdmin)

    // Welcome notification + signup analytics event — awaited so a slow insert can't race the
    // response, but non-fatal if either fails (see notifyAndTrackSignup).
    void notifyAndTrackSignup(authData.user.id, fullName, 'email')

    // Fire-and-forget: welcome email. Supabase sends the confirmation link itself, separately.
    void sendWelcomeEmail({
      email:        email,
      fullName:     fullName,
      startupName:  baseStartupName ?? 'Your Startup',
    }).catch(e => log.warn('[signup] welcome email failed:', e instanceof Error ? e.message : e))

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
      },
    }, { status: 201 });
  } catch (error) {
    log.error('Error during signup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
