import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Use admin client with service role key to bypass email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get signup data from request
    const {
      email, password, fullName, startupName, industry, stage, funding, timeCommitment,
      // Registration fields (new)
      companyName, website, foundedDate, incorporationType, description,
      revenueStatus, fundingStatus, teamSize, founderName, linkedinUrl,
      cofounderCount, yearsOnProblem, priorExperience,
    } = await request.json();

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Map onboarding stage values to DB-accepted values (CHECK constraint uses legacy set)
    const STAGE_MAP: Record<string, string> = {
      'pre-product': 'idea',
      'mvp':         'mvp',
      'beta':        'mvp',
      'launched':    'launched',
      'growing':     'scaling',
    };
    const dbStage = STAGE_MAP[stage] ?? stage ?? 'idea';

    // Attempt to create user directly — handle duplicate email via error response
    // (avoids fetching all users just to check existence)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        startup_name: startupName || companyName,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
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
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create founder profile with all registration fields
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('founder_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        startup_name: companyName || startupName || null,
        industry: industry || null,
        stage: dbStage,
        funding: fundingStatus || funding || null,
        time_commitment: timeCommitment || null,
        role: 'founder',
        subscription_tier: 'free',
        onboarding_completed: true,
        assessment_completed: false,
        // New registration columns
        company_name: companyName || startupName || null,
        website: website || null,
        founded_date: foundedDate || null,
        incorporation_type: incorporationType || null,
        description: description || null,
        revenue_status: revenueStatus || null,
        funding_status: fundingStatus || funding || null,
        team_size: teamSize || null,
        founder_name: founderName || fullName,
        linkedin_url: linkedinUrl || null,
        cofounder_count: cofounderCount ?? null,
        years_on_problem: yearsOnProblem || null,
        prior_experience: priorExperience || null,
        registration_completed: true,
        profile_builder_completed: false,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating founder profile:', profileError);
      // Roll back auth user to avoid orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(e =>
        console.error('Failed to rollback auth user after profile error:', e)
      );
      return NextResponse.json(
        { error: 'Account setup failed. Please try again.' },
        { status: 500 }
      );
    }

    // Insert zero Q-Score row — honest baseline before Profile Builder
    const { error: qscoreErr } = await supabaseAdmin.from('qscore_history').insert({
      user_id: authData.user.id,
      overall_score: 0,
      data_source: 'registration',
    });
    if (qscoreErr) console.error('Failed to insert initial qscore row:', qscoreErr);

    // Initialize subscription usage limits for free tier
    const featureLimits = [
      { feature: 'agent_chat', usage_count: 0, limit_count: 50 }, // 50 agent chats/month
      { feature: 'qscore_recalc', usage_count: 0, limit_count: 2 }, // 2 recalcs/month
      { feature: 'investor_connection', usage_count: 0, limit_count: 3 }, // 3 connections/month
    ];

    await Promise.all(featureLimits.map(limit =>
      supabaseAdmin.from('subscription_usage').insert({
        user_id: authData.user.id,
        feature: limit.feature,
        usage_count: limit.usage_count,
        limit_count: limit.limit_count,
        reset_at: getNextMonthDate(),
      })
    ));

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
      },
      profile,
    });
  } catch (error) {
    console.error('Error during signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get date one month from now
function getNextMonthDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return nextMonth.toISOString();
}
