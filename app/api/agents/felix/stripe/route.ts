import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/felix/stripe
// Body: { stripeKey }
// Fetches live MRR, ARR, customer count, churn from Stripe using a restricted key.
// The key is used once and NOT stored.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stripeKey } = await request.json()
    if (!stripeKey || typeof stripeKey !== 'string' || !stripeKey.startsWith('rk_')) {
      return NextResponse.json({ error: 'A valid Stripe restricted key (rk_...) is required' }, { status: 400 })
    }

    const stripeHeaders = {
      'Authorization': `Bearer ${stripeKey}`,
      'Stripe-Version': '2024-06-20',
    }

    // Fetch subscriptions to calculate MRR
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
        error: (errData as { error?: { message?: string } })?.error?.message ?? 'Stripe API error — check key permissions',
      }, { status: 400 })
    }

    const subsData = await subscriptionsRes.json() as {
      data: Array<{
        status: string;
        items: { data: Array<{ plan?: { amount?: number; interval?: string }; price?: { unit_amount?: number; recurring?: { interval?: string } } }> };
        current_period_start: number;
        current_period_end: number;
      }>;
      has_more: boolean;
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
        const monthly = interval === 'year' ? amount / 12 : amount
        monthlyRevenue += monthly
      }
    }

    const mrr = Math.round(monthlyRevenue / 100) // Stripe amounts are in cents
    const arr = mrr * 12
    const activeSubCount = activeSubs.length
    const totalCustomers = custData.total_count

    // Fetch recent charges for last-30-day revenue
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const chargesRes = await fetch(
      `https://api.stripe.com/v1/charges?created[gte]=${thirtyDaysAgo}&limit=100&status=succeeded`,
      { headers: stripeHeaders }
    )
    let last30DayRevenue = 0
    if (chargesRes.ok) {
      const chargesData = await chargesRes.json() as { data: Array<{ amount: number }> }
      last30DayRevenue = Math.round((chargesData.data ?? []).reduce((sum, c) => sum + (c.amount ?? 0), 0) / 100)
    }

    return NextResponse.json({
      mrr,
      arr,
      activeSubscriptions: activeSubCount,
      totalCustomers,
      last30DayRevenue,
      currency: 'USD',
      dataSource: 'stripe_live',
    })
  } catch (err) {
    console.error('Felix Stripe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
