import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
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
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    log.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Idempotency: deduplicate Stripe retries using the event ID.
  // Stripe retries webhooks up to 3 times on non-2xx responses.
  const { data: existing } = await admin
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, deduplicated: true })
  }

  await admin.from('processed_webhook_events').insert({
    event_id: event.id,
    source: 'stripe',
    processed_at: new Date().toISOString(),
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId   = session.metadata?.user_id
        const userType = session.metadata?.userType  // 'founder' | undefined (investors don't set this)
        if (!userId) break

        if (userType === 'founder') {
          await admin.from('founder_profiles').update({
            subscription_tier:      'premium',
            subscription_status:    'active',
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq('user_id', userId)
        } else {
          await admin.from('investor_profiles').update({
            subscription_tier:      'pro',
            subscription_status:    'active',
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq('user_id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const periodEnd = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined
        const update = {
          subscription_status:             sub.status,
          subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }

        // Try investor first, then founder
        const { data: invProfile } = await admin
          .from('investor_profiles')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .limit(1)
          .maybeSingle()

        if (invProfile) {
          await admin.from('investor_profiles').update(update).eq('stripe_subscription_id', sub.id)
        } else {
          await admin.from('founder_profiles').update(update).eq('stripe_subscription_id', sub.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        // Try investor first, then founder
        const { data: invProfile } = await admin
          .from('investor_profiles')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .limit(1)
          .maybeSingle()

        if (invProfile) {
          await admin.from('investor_profiles').update({
            subscription_tier:   'free',
            subscription_status: 'canceled',
          }).eq('stripe_subscription_id', sub.id)
        } else {
          await admin.from('founder_profiles').update({
            subscription_tier:   'free',
            subscription_status: 'canceled',
          }).eq('stripe_subscription_id', sub.id)
        }
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
