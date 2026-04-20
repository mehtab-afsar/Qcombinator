import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import { log } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    log.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) break
        await admin.from('investor_profiles').update({
          subscription_tier:       'pro',
          subscription_status:     'active',
          stripe_customer_id:      session.customer as string,
          stripe_subscription_id:  session.subscription as string,
        }).eq('user_id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const { data: profiles } = await admin
          .from('investor_profiles')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .limit(1)
        if (!profiles?.[0]) break
        const periodEnd = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined
        await admin.from('investor_profiles').update({
          subscription_status:             sub.status,
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin.from('investor_profiles').update({
          subscription_tier:   'free',
          subscription_status: 'canceled',
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      default:
        break
    }
  } catch (err) {
    log.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
