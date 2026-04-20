import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

// POST /api/stripe/connect
// Body: { restrictedKey }
// Fetches live MRR/ARR/customers from Stripe, stores verified metrics in founder_profiles.
// The restricted key is used once to fetch metrics and is NEVER persisted.
//
// Cross-validates against the most recent self-reported assessment:
// if |stripe_mrr - reported_mrr| / stripe_mrr > 30% → stores STRIPE_SELF_REPORT_DELTA flag

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { restrictedKey } = await request.json()
    if (!restrictedKey || typeof restrictedKey !== 'string' || !restrictedKey.startsWith('rk_')) {
      return NextResponse.json(
        { error: 'A valid Stripe restricted key (rk_...) is required' },
        { status: 400 }
      )
    }

    const stripeHeaders = {
      'Authorization': `Bearer ${restrictedKey}`,
      'Stripe-Version': '2024-06-20',
    }

    // ── 1. Fetch Stripe data ────────────────────────────────────────────────
    const [subscriptionsRes, customersRes] = await Promise.all([
      fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.plan', {
        headers: stripeHeaders,
      }),
      fetch('https://api.stripe.com/v1/customers?limit=1', {
        headers: stripeHeaders,
      }),
    ])

    if (!subscriptionsRes.ok) {
      const errData = await subscriptionsRes.json().catch(() => ({}))
      return NextResponse.json({
        error: (errData as { error?: { message?: string } })?.error?.message
          ?? 'Stripe API error — check key permissions (subscriptions:read required)',
      }, { status: 400 })
    }

    const subsData = await subscriptionsRes.json() as {
      data: Array<{
        items: {
          data: Array<{
            plan?: { amount?: number; interval?: string }
            price?: { unit_amount?: number; recurring?: { interval?: string } }
          }>
        }
      }>
    }

    const custData = customersRes.ok
      ? await customersRes.json() as { total_count?: number }
      : { total_count: undefined }

    // Calculate MRR from active subscriptions
    let monthlyRevenue = 0
    const activeSubs = subsData.data ?? []
    for (const sub of activeSubs) {
      for (const item of sub.items?.data ?? []) {
        const amount = item.price?.unit_amount ?? item.plan?.amount ?? 0
        const interval = item.price?.recurring?.interval ?? item.plan?.interval ?? 'month'
        monthlyRevenue += interval === 'year' ? amount / 12 : amount
      }
    }

    const stripeMrr = Math.round(monthlyRevenue / 100) // cents → dollars
    const stripeArr = stripeMrr * 12
    const stripeCustomers = activeSubs.length
    const totalCustomers = custData.total_count

    // Fetch last-30-day revenue
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const chargesRes = await fetch(
      `https://api.stripe.com/v1/charges?created[gte]=${thirtyDaysAgo}&limit=100&status=succeeded`,
      { headers: stripeHeaders }
    )
    let stripeLast30 = 0
    if (chargesRes.ok) {
      const chargesData = await chargesRes.json() as { data: Array<{ amount: number }> }
      stripeLast30 = Math.round(
        (chargesData.data ?? []).reduce((sum, c) => sum + (c.amount ?? 0), 0) / 100
      )
    }

    // ── 2. Persist verified metrics — key is never stored ──────────────────
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    )

    const { error: updateError } = await adminClient
      .from('founder_profiles')
      .update({
        stripe_verified:    true,
        stripe_verified_at: new Date().toISOString(),
        stripe_mrr:         stripeMrr,
        stripe_arr:         stripeArr,
        stripe_customers:   stripeCustomers,
        stripe_last30:      stripeLast30,
        stripe_account_id:  'connected', // proof of connection; key is NOT stored
        updated_at:         new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      log.error('[Stripe Connect] Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to save verified metrics' }, { status: 500 })
    }

    // ── 3. Cross-validate against most recent self-reported assessment ──────
    const { data: latestScore } = await adminClient
      .from('qscore_history')
      .select('assessment_data, id')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    let deltaFlag: {
      field: string
      signal: string
      severity: string
      description: string
    } | null = null

    if (latestScore?.assessment_data) {
      const assessed = latestScore.assessment_data as { financial?: { mrr?: number } }
      const reportedMrr = assessed?.financial?.mrr ?? 0

      if (reportedMrr > 0 && stripeMrr > 0) {
        const delta = Math.abs(stripeMrr - reportedMrr) / stripeMrr
        if (delta > 0.30) {
          deltaFlag = {
            field: 'financial.mrr',
            signal: 'stripe_self_report_delta',
            severity: delta > 0.60 ? 'high' : 'medium',
            description:
              `Self-reported MRR ($${reportedMrr.toLocaleString()}) differs from Stripe-verified ` +
              `MRR ($${stripeMrr.toLocaleString()}) by ${Math.round(delta * 100)}%`,
          }

          // Store the conflict signal in ai_actions of the latest qscore_history row
          const existing = (latestScore as { ai_actions?: Record<string, unknown> }).ai_actions ?? {}
          const existingFlags = (existing.bluff_flags as typeof deltaFlag[] | undefined) ?? []
          await adminClient
            .from('qscore_history')
            .update({
              ai_actions: {
                ...existing,
                bluff_flags: [...existingFlags, { ...deltaFlag, detected_at: new Date().toISOString() }],
              },
            })
            .eq('id', latestScore.id)
        }
      }
    }

    // ── 4. Recalculate Signal Strength now that Stripe is connected ─────────
    // Import lazily to avoid circular dependency at module load
    const { calculateSignalStrength, calculateIntegrityIndex } = await import(
      '@/features/qscore/services/signal-strength'
    )

    const latestAssessment = (latestScore?.assessment_data ?? {}) as Record<string, unknown>
    const signalStrength = calculateSignalStrength(latestAssessment, true /* stripeConnected */)
    const integrityIndex = calculateIntegrityIndex(
      latestScore?.id ? [deltaFlag].filter(Boolean).length : 0,
      latestScore?.id ? 1 : 0
    )

    await adminClient
      .from('founder_profiles')
      .update({ signal_strength: signalStrength, integrity_index: integrityIndex })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      verified: {
        mrr:       stripeMrr,
        arr:       stripeArr,
        customers: stripeCustomers,
        last30:    stripeLast30,
        totalCustomers,
      },
      signalStrength,
      integrityIndex,
      deltaFlag: deltaFlag ?? null,
    })
  } catch (err) {
    log.error('[Stripe Connect] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/stripe/connect — returns current Stripe verification status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('stripe_verified, stripe_verified_at, stripe_mrr, stripe_arr, stripe_customers, stripe_last30, signal_strength, integrity_index')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ profile: profile ?? null })
  } catch (err) {
    log.error('[Stripe Connect GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
