import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseBody, signupSchema } from '@/lib/api/validate';
import { startupProfileDataSchema } from '@/lib/api/jsonb-schemas';
import { log } from '@/lib/logger'
import { routedText } from '@/lib/llm/router'
import { sendWelcomeAndConfirmEmail } from '@/lib/email/send'

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
      problemStatement, targetCustomer, location, tagline,
    } = parsed.data;

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

    // DB CHECK constraint (20260420000003): stage IN ('idea','mvp','pre-seed','seed','series-a','bootstrapped')
    const STAGE_MAP: Record<string, string> = {
      'pre-product':         'idea',
      'idea':                'idea',
      'product-development': 'mvp',
      'mvp':                 'mvp',
      'beta':                'mvp',
      'pre-seed':            'pre-seed',
      'commercial':          'seed',
      'launched':            'seed',
      'seed':                'seed',
      'series-a':            'series-a',
      'growth-scaling':      'series-a',
      'growing':             'series-a',
      'scaling':             'series-a',
      'bootstrapped':        'bootstrapped',
    };
    const dbStage = STAGE_MAP[stage ?? ''] ?? 'idea';

    const INDUSTRY_MAP: Record<string, string> = {
      'medtech-biotech':     'biotech',
      'ai-software':         'ai_ml',
      'robotics-hardware':   'hardware',
      'agri-foodtech':       'default',
      'clean-tech':          'climate',
    };
    const dbIndustry = INDUSTRY_MAP[industry ?? ''] ?? industry ?? null;

    const FUNDING_MAP: Record<string, string> = {
      'friends-family':     'pre-seed',
      'angel':              'pre-seed',
      'vc':                 'seed',
      'friends-and-family': 'pre-seed',
      'series-a-plus':      'series-a',
    };
    const dbFunding = fundingStatus ? (FUNDING_MAP[fundingStatus] ?? fundingStatus) : null;

    const REVENUE_MAP: Record<string, string> = {
      'early-revenue': 'first-revenue',
      'recurring':     'mrr-10k-100k',
    };
    const dbRevenue = revenueStatus ? (REVENUE_MAP[revenueStatus] ?? revenueStatus) : null;

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

    const confirmToken = randomUUID()

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('founder_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        startup_name: uniqueStartupName,
        industry: dbIndustry,
        stage: dbStage,
        funding: dbFunding,
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
        email_confirm_token: confirmToken,
        startup_profile_data: startupProfileDataSchema.parse({
          problemStatement: problemStatement || undefined,
          targetCustomer:   targetCustomer   || undefined,
        }),
      })
      .select()
      .single();

    if (profileError) {
      log.error('Error creating founder profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(e =>
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
      { feature: 'agent_chat',           usage_count: 0, limit_count: 50 },
      { feature: 'qscore_recalc',        usage_count: 0, limit_count: 2  },
      { feature: 'investor_connection',  usage_count: 0, limit_count: 3  },
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

    // Fire-and-forget: clean + summarise onboarding text in background (~2–5s)
    void enrichOnboardingText(authData.user.id, problemStatement, targetCustomer, supabaseAdmin)

    // Fire-and-forget: send welcome + email confirmation email
    void sendWelcomeAndConfirmEmail({
      email:        email,
      fullName:     fullName,
      startupName:  baseStartupName ?? 'Your Startup',
      confirmToken,
    }).catch(e => log.warn('[signup] welcome email failed:', e instanceof Error ? e.message : e))

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
      },
      profile,
    }, { status: 201 });
  } catch (error) {
    log.error('Error during signup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getNextMonthDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
}

async function enrichOnboardingText(
  userId: string,
  problemStatement: string | undefined,
  targetCustomer: string | undefined,
  supabase: SupabaseClient,
): Promise<void> {
  if (!problemStatement && !targetCustomer) return

  const prompt = `You are cleaning startup onboarding responses. Fix typos and grammar only — preserve the founder's meaning exactly. Do not add, remove, or reinterpret ideas.

Problem statement (raw): "${problemStatement ?? ''}"
Ideal customer (raw): "${targetCustomer ?? ''}"

Return ONLY valid JSON, no markdown fences:
{
  "problemStatementCleaned": "...",
  "targetCustomerCleaned": "...",
  "problemSummary": "One clear sentence: what they build and who it's for."
}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  try {
    const raw = await routedText('extraction', [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Clean and summarise.' },
    ])
    clearTimeout(timer)
    const cleaned = JSON.parse(
      raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    ) as { problemStatementCleaned?: string; targetCustomerCleaned?: string; problemSummary?: string }
    await supabase.rpc('merge_startup_profile_data', {
      p_user_id: userId,
      p_patch: {
        problemStatementCleaned: cleaned.problemStatementCleaned ?? undefined,
        targetCustomerCleaned:   cleaned.targetCustomerCleaned   ?? undefined,
        problemSummary:          cleaned.problemSummary          ?? undefined,
      },
    })
  } catch (err) {
    clearTimeout(timer)
    log.warn('Onboarding text enrichment failed — raw text retained', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
