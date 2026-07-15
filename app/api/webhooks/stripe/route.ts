import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createTypedAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import { log } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import { trackUpgradedToPremium, trackChurned } from '@/lib/analytics'
import { FOUNDER_PLAN_LIMITS, INVESTOR_PRO_LIMITS } from '@/lib/billing/plans'

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

  const admin = createTypedAdminClient()

  // Idempotency: deduplicate Stripe retries using the event ID.
  // upsert with ignoreDuplicates = INSERT ... ON CONFLICT DO NOTHING, so a
  // concurrent retry can't TOCTOU past the check; count 0 means already processed.
  const { error: dedupError, count } = await admin
    .from('processed_webhook_events')
    .upsert({
      event_id:     event.id,
      source:       'stripe',
      processed_at: new Date().toISOString(),
    }, { onConflict: 'event_id', ignoreDuplicates: true, count: 'exact' })

  if (dedupError) {
    log.error('Stripe webhook dedup insert failed:', dedupError)
    return NextResponse.json({ error: 'Dedup failure' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ received: true, deduplicated: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId   = session.metadata?.user_id
        const userType = session.metadata?.userType  // 'founder' | undefined (investors don't set this)
        // customer/subscription are string | expanded object | null in Stripe types
        const customerId     = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (!userId || !customerId || !subscriptionId) {
          // Permanently malformed session (e.g. created without metadata or not a
          // subscription checkout) — ack with 200; a Stripe retry cannot fix this.
          log.error('Stripe checkout.session.completed missing required fields — skipped', {
            sessionId: session.id,
            hasUserId: Boolean(userId),
            hasCustomer: Boolean(customerId),
            hasSubscription: Boolean(subscriptionId),
          })
          break
        }

        if (userType === 'founder') {
          await admin.from('founder_profiles').update({
            subscription_tier:      'premium',
            subscription_status:    'active',
            stripe_customer_id:     customerId,
            stripe_subscription_id: subscriptionId,
          }).eq('user_id', userId)

          void Promise.resolve().then(() => trackUpgradedToPremium(userId, { plan: 'founder_premium' }))

          const premium = FOUNDER_PLAN_LIMITS.premium
          await Promise.all(
            (['agent_chat', 'investor_connection', 'qscore_recalc'] as const).map(feature =>
              admin.from('subscription_usage').upsert(
                { user_id: userId, feature, limit_count: premium[feature], usage_count: 0, reset_at: nextMonthStart() },
                { onConflict: 'user_id,feature' }
              )
            )
          )
        } else {
          await admin.from('investor_profiles').update({
            subscription_tier:      'pro',
            subscription_status:    'active',
            stripe_customer_id:     customerId,
            stripe_subscription_id: subscriptionId,
          }).eq('user_id', userId)

          await admin.from('subscription_usage').upsert(
            { user_id: userId, feature: 'investor_connection', limit_count: INVESTOR_PRO_LIMITS.investor_connection, usage_count: 0, reset_at: nextMonthStart() },
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
            // Captured locally: TypeScript drops the fp?.user_id narrowing inside
            // the callbacks below, since a property could change before they run.
            const churnedUserId = fp.user_id

            void Promise.resolve().then(() => trackChurned(churnedUserId, { plan: 'founder_premium' }))

            const free = FOUNDER_PLAN_LIMITS.free
            await Promise.all(
              (['agent_chat', 'investor_connection', 'qscore_recalc'] as const).map(feature =>
                admin.from('subscription_usage')
                  .update({ limit_count: free[feature] })
                  .eq('user_id', churnedUserId).eq('feature', feature)
              )
            )
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
