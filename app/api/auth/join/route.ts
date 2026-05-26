import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { sendWelcomeAndConfirmEmail } from '@/lib/email/send'

// POST /api/auth/join
// Invite-aware founder signup. Validates the invite token, creates the account,
// then auto-links the founder to the investor's portfolio company record.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, fullName, companyName, stage, industry, inviteToken } = body

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'email, password, and fullName are required' }, { status: 400 })
    }

    if (!inviteToken) {
      return NextResponse.json({ error: 'inviteToken is required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase env vars')
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Validate the invite token
    const { data: portfolioCompany, error: tokenErr } = await supabaseAdmin
      .from('investor_portfolio_companies')
      .select('id, investor_user_id, company_name, invite_status')
      .eq('invite_token', inviteToken)
      .single()

    if (tokenErr || !portfolioCompany) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }

    if (portfolioCompany.invite_status === 'accepted') {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 409 })
    }

    // Fetch investor profile for pipeline + connection setup
    const { data: investorProfile } = await supabaseAdmin
      .from('investor_profiles')
      .select('id, user_id')
      .eq('user_id', portfolioCompany.investor_user_id)
      .single()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, startup_name: companyName || portfolioCompany.company_name },
    })

    if (authError) {
      const isDuplicate =
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists') ||
        authError.status === 422
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please login instead.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: authError.message || 'Failed to create account' }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const userId = authData.user.id
    const confirmToken = randomUUID()
    const baseStartupName = companyName || portfolioCompany.company_name
    const uniqueStartupName = baseStartupName ? `${baseStartupName}-${userId.slice(0, 6)}` : null

    // Create founder_profiles with portfolio_investor_id pre-linked
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('founder_profiles')
      .insert({
        user_id:               userId,
        full_name:             fullName,
        startup_name:          uniqueStartupName,
        industry:              industry || null,
        stage:                 stage || 'idea',
        role:                  'founder',
        subscription_tier:     'free',
        onboarding_completed:  true,
        assessment_completed:  false,
        email_confirm_token:   confirmToken,
        portfolio_investor_id: investorProfile?.id ?? null,
      })
      .select()
      .single()

    if (profileError) {
      log.error('/api/auth/join profile insert failed', { profileError })
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json({ error: 'Account setup failed. Please try again.' }, { status: 500 })
    }

    // Insert initial Q-Score row
    const { error: qErr } = await supabaseAdmin.from('qscore_history').insert({
      user_id:       userId,
      overall_score: 0,
      data_source:   'registration',
    })
    if (qErr) log.error('join: qscore insert failed', { e: qErr })

    // Insert usage limits
    const usageResults = await Promise.all([
      supabaseAdmin.from('subscription_usage').insert({ user_id: userId, feature: 'agent_chat',          usage_count: 0, limit_count: 50 }),
      supabaseAdmin.from('subscription_usage').insert({ user_id: userId, feature: 'qscore_recalc',       usage_count: 0, limit_count: 2  }),
      supabaseAdmin.from('subscription_usage').insert({ user_id: userId, feature: 'investor_connection', usage_count: 0, limit_count: 3  }),
    ])
    const usageErr = usageResults.find(r => r.error)?.error
    if (usageErr) log.error('join: subscription_usage insert failed', { e: usageErr })

    // Link the portfolio company record
    await linkInvitedFounder(supabaseAdmin, {
      portfolioCompanyId: portfolioCompany.id,
      investorUserId:     portfolioCompany.investor_user_id,
      founderUserId:      userId,
      companyName:        baseStartupName,
    })

    // Fire-and-forget welcome email
    void sendWelcomeAndConfirmEmail({
      email,
      fullName,
      startupName:  baseStartupName ?? 'Your Startup',
      confirmToken,
    }).catch((e) => log.warn('join: welcome email failed', e))

    return NextResponse.json({
      message: 'Account created successfully',
      user: { id: userId, email, fullName },
      profile,
    }, { status: 201 })
  } catch (err) {
    log.error('POST /api/auth/join', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkInvitedFounder(
  supabase: ReturnType<typeof createClient<any, any, any>>,
  opts: {
    portfolioCompanyId: string
    investorUserId:     string
    founderUserId:      string
    companyName:        string | null
  }
) {
  const { portfolioCompanyId, investorUserId, founderUserId } = opts

  try {
    await Promise.all([
      // Mark invite as accepted
      supabase
        .from('investor_portfolio_companies')
        .update({ founder_user_id: founderUserId, invite_status: 'accepted', joined_at: new Date().toISOString() })
        .eq('id', portfolioCompanyId),

      // Place in investor's CRM pipeline at 'portfolio' stage
      supabase
        .from('investor_pipeline')
        .upsert({ investor_user_id: investorUserId, founder_user_id: founderUserId, stage: 'portfolio' },
                 { onConflict: 'investor_user_id,founder_user_id' }),

      // Auto-create accepted connection so messaging works immediately (upsert to be idempotent)
      supabase
        .from('connection_requests')
        .upsert(
          { founder_id: founderUserId, investor_id: investorUserId, status: 'accepted', personal_message: 'Connected via portfolio invite', founder_qscore: 0 },
          { onConflict: 'founder_id,investor_id', ignoreDuplicates: true }
        ),
    ])
  } catch (e) {
    log.error('linkInvitedFounder failed', { e })
  }

  // Notify investor (fire-and-forget)
  void supabase.from('notifications').insert({
    user_id:  investorUserId,
    type:     'message',
    title:    `${opts.companyName ?? 'A portfolio company'} just joined Edge Alpha`,
    body:     'They joined via your portfolio invite. Check your portfolio to see their Q-Score.',
    metadata: { founder_user_id: founderUserId },
  })
}
