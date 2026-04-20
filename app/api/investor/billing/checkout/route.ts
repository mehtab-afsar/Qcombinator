import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('investor_profiles')
      .select('stripe_customer_id, subscription_tier, full_name')
      .eq('user_id', user.id)
      .single()

    // If already pro, redirect to billing portal instead
    if (profile?.subscription_tier === 'pro') {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id!,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/investor/billing`,
      })
      return NextResponse.json({ url: portalSession.url })
    }

    // Create or retrieve Stripe customer
    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: (profile?.full_name as string) || user.email,
        metadata: { user_id: user.id, role: 'investor' },
      })
      customerId = customer.id
      await admin
        .from('investor_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_INVESTOR_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/investor/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/investor/billing`,
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error('POST /api/investor/billing/checkout', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
