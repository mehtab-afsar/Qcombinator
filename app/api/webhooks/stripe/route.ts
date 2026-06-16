import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import { log } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import { trackUpgradedToPremium, trackChurned } from '@/lib/analytics'

function nextMonthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}

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
  // Uses INSERT ... ON CONFLICT DO NOTHING to prevent TOCTOU race on concurrent retries.
  const { count } = await admin
    .from('processed_webhook_events')
    .insert({
      event_id:     event.id,
      source:       'stripe',
      processed_at: new Date().toISOString(),
    }, { count: 'exact' })
    .onConflict('event_id')
    .ignore()

  if (count === 0) {
    return NextResponse.json({ received: true, deduplicated: true })
  }

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

          void Promise.resolve().then(() => trackUpgradedToPremium(userId, { plan: 'founder_premium' }))
          // Upgrade usage limits: premium founders get 500 agent chats/mo
          // and effectively unlimited investor connections + Q-Score recalcs.
          await Promise.all([
            admin.from('subscription_usage').upsert(
              { user_id: userId, feature: 'agent_chat',           limit_count: 500,    usage_count: 0, reset_at: nextMonthStart() },
              { onConflict: 'user_id,feature' }
            ),
            admin.from('subscription_usage').upsert(
              { user_id: userId, feature: 'investor_connection',  limit_count: 999999, usage_count: 0, reset_at: nextMonthStart() },
              { onConflict: 'user_id,feature' }
            ),
            admin.from('subscription_usage').upsert(
              { user_id: userId, feature: 'qscore_recalc',        limit_count: 999999, usage_count: 0, reset_at: nextMonthStart() },
              { onConflict: 'user_id,feature' }
            ),
          ])
        } else {
          await admin.from('investor_profiles').update({
            subscription_tier:      'pro',
            subscription_status:    'active',
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq('user_id', userId)

          // Investor Pro: effectively unlimited deal-flow connections
          await admin.from('subscription_usage').upsert(
            { user_id: userId, feature: 'investor_connection', limit_count: 999999, usage_count: 0, reset_at: nextMonthStart() },
            { onConflict: 'user_id,feature' }
          )
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
          // Reset founder usage limits back to free tier on cancellation
          const { data: fp } = await admin
            .from('founder_profiles')
            .select('user_id')
            .eq('stripe_subscription_id', sub.id)
            .maybeSingle()

          await admin.from('founder_profiles').update({
            subscription_tier:   'free',
            subscription_status: 'canceled',
          }).eq('stripe_subscription_id', sub.id)

          if (fp?.user_id) {
            void Promise.resolve().then(() => trackChurned(fp.user_id, { plan: 'founder_premium' }))
            await Promise.all([
              admin.from('subscription_usage')
                .update({ limit_count: 50 })
                .eq('user_id', fp.user_id).eq('feature', 'agent_chat'),
              admin.from('subscription_usage')
                .update({ limit_count: 3 })
                .eq('user_id', fp.user_id).eq('feature', 'investor_connection'),
              admin.from('subscription_usage')
                .update({ limit_count: 2 })
                .eq('user_id', fp.user_id).eq('feature', 'qscore_recalc'),
            ])
          }
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    log.error('Webhook handler error:', err)
    Sentry.captureException(err, { tags: { source: 'stripe_webhook', event_type: event.type } })
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
