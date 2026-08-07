import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'

export interface CreatePortalSessionParams {
  table: 'founder_profiles' | 'investor_profiles'
  userId: string
  returnPath: '/founder/billing' | '/investor/billing'
}

export type CreatePortalSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number }

/** Founder and investor "Manage billing" both do exactly this — open a Stripe portal session
 *  for whichever customer is on file. Shared so the two routes stay in lockstep. */
export async function createPortalSession(
  params: CreatePortalSessionParams
): Promise<CreatePortalSessionResult> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from(params.table)
    .select('stripe_customer_id')
    .eq('user_id', params.userId)
    .single()

  if (!profile?.stripe_customer_id) {
    return { ok: false, error: 'No billing account found', status: 404 }
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}${params.returnPath}`,
  })

  return { ok: true, url: session.url }
}
