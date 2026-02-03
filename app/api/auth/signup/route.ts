import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get signup data from request
    const { email, password, fullName, startupName, industry, stage } = await request.json();

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          startup_name: startupName,
        },
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
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

    // Create founder profile
    const { data: profile, error: profileError } = await supabase
      .from('founder_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        startup_name: startupName || null,
        industry: industry || null,
        stage: stage || 'idea',
        subscription_tier: 'free',
        onboarding_completed: false,
        assessment_completed: false,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating founder profile:', profileError);
      // Note: User auth account was created, but profile failed
      // In production, you might want to handle this with a retry mechanism
      return NextResponse.json(
        { error: 'Account created but profile setup failed. Please contact support.' },
        { status: 500 }
      );
    }

    // Initialize subscription usage limits for free tier
    const featureLimits = [
      { feature: 'agent_chat', usage_count: 0, limit_count: 10 }, // 10 agent chats/month
      { feature: 'qscore_recalc', usage_count: 0, limit_count: 2 }, // 2 recalcs/month
      { feature: 'investor_connection', usage_count: 0, limit_count: 3 }, // 3 connections/month
    ];

    for (const limit of featureLimits) {
      await supabase.from('subscription_usage').insert({
        user_id: authData.user.id,
        feature: limit.feature,
        usage_count: limit.usage_count,
        limit_count: limit.limit_count,
        reset_at: getNextMonthDate(),
      });
    }

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
