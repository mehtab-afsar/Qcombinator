import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { APP_URL } from '@/lib/constants/app'

export interface CreateCheckoutSessionParams {
  table: 'founder_profiles' | 'investor_profiles'
  userId: string
  userEmail: string | undefined
  /** The subscription_tier value that means "already on the paid plan" for this side. */
  premiumTierValue: 'premium' | 'pro'
  priceEnvVar: 'STRIPE_FOUNDER_PREMIUM_PRICE_ID' | 'STRIPE_INVESTOR_PRO_PRICE_ID'
  returnPath: '/founder/billing' | '/investor/billing'
  metadataRole: 'founder' | 'investor'
  /** Shown to the user when the price env var isn't configured. Defaults to a generic message. */
  notConfiguredMessage?: string
}

export type CreateCheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number }

/** Founder and investor checkout are the same Stripe flow with different tables, tier names,
 *  price IDs and metadata — this is the config-over-code shared version of both. */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from(params.table)
    .select('stripe_customer_id, subscription_tier, full_name')
    .eq('user_id', params.userId)
    .single()

  // Already on the paid tier — redirect to the billing portal instead of re-checking-out.
  if (profile?.subscription_tier === params.premiumTierValue) {
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id as string,
      return_url: `${APP_URL}${params.returnPath}`,
    })
    return { ok: true, url: portalSession.url }
  }

  // Create or retrieve the Stripe customer.
  let customerId = profile?.stripe_customer_id as string | null | undefined
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: params.userEmail,
      name: (profile?.full_name as string) || params.userEmail,
      metadata: { user_id: params.userId, role: params.metadataRole },
    })
    customerId = customer.id
    await admin
      .from(params.table)
      .update({ stripe_customer_id: customerId })
      .eq('user_id', params.userId)
  }

  const priceId = process.env[params.priceEnvVar]
  if (!priceId) {
    log.error(`${params.priceEnvVar} is not configured`)
    return { ok: false, error: params.notConfiguredMessage ?? 'Billing not configured', status: 503 }
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${APP_URL}${params.returnPath}?success=1`,
    cancel_url:  `${APP_URL}${params.returnPath}`,
    metadata: { user_id: params.userId, userType: params.metadataRole },
  })

  if (!session.url) {
    log.error('Stripe checkout session created with no url', { userId: params.userId })
    return { ok: false, error: 'Could not start checkout', status: 502 }
  }

  return { ok: true, url: session.url }
}
