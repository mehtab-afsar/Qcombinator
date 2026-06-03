import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('founder_profiles')
      .select('stripe_customer_id, subscription_tier, full_name')
      .eq('user_id', user.id)
      .single()

    // Already premium — redirect to billing portal instead
    if (profile?.subscription_tier === 'premium') {
      const portalSession = await getStripe().billingPortal.sessions.create({
        customer: profile.stripe_customer_id!,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/founder/billing`,
      })
      return NextResponse.json({ url: portalSession.url })
    }

    // Create or retrieve Stripe customer
    let customerId = profile?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: (profile?.full_name as string) || user.email,
        metadata: { user_id: user.id, role: 'founder' },
      })
      customerId = customer.id
      await admin
        .from('founder_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_FOUNDER_PREMIUM_PRICE_ID!, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/founder/billing?success=1`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/founder/billing`,
      metadata: { user_id: user.id, userType: 'founder' },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error('POST /api/founder/billing/checkout', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
