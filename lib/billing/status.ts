import { createAdminClient } from '@/lib/supabase/server'
import { FOUNDER_PLAN_LIMITS, INVESTOR_FREE_LIMITS, INVESTOR_PRO_LIMITS, toDisplayLimit, type FounderTier } from '@/lib/billing/plans'

export interface ComputeBillingStatusParams {
  table: 'founder_profiles' | 'investor_profiles'
  userId: string
  /** Founder billing shows a usage block (agent chat / Q-Score recalc / investor connections);
   *  investor billing doesn't — there's no investor-side usage metering wired up yet (nothing
   *  increments investor_connection usage or seeds a free-tier row for investors at signup).
   *  That's a real gap, not something this flag should paper over — see docs. */
  includeUsage: boolean
}

export interface BillingUsage {
  // Founder-only — an investor's usage object won't include these, rather than showing
  // fake zeros for features that don't apply to investors at all.
  agentChat?: { used: number; limit: number | null }
  qscoreRecalc?: { used: number; limit: number | null }
  investorConnection?: { used: number; limit: number | null }
}

export interface BillingStatus {
  subscriptionTier: string
  subscriptionStatus: string | null
  periodEnd: string | null
  usage?: BillingUsage
}

/** The subscription fields founder and investor billing-status both read — same shape,
 *  different table. */
export async function computeBillingStatus(params: ComputeBillingStatusParams): Promise<BillingStatus> {
  const admin = createAdminClient()

  if (!params.includeUsage) {
    const { data } = await admin
      .from(params.table)
      .select('subscription_tier, subscription_status, subscription_current_period_end')
      .eq('user_id', params.userId)
      .single()

    return {
      subscriptionTier:   (data?.subscription_tier as string) ?? 'free',
      subscriptionStatus: (data?.subscription_status as string) ?? null,
      periodEnd:          (data?.subscription_current_period_end as string) ?? null,
    }
  }

  const [{ data: profile }, { data: usageRows }] = await Promise.all([
    admin
      .from(params.table)
      .select('subscription_tier, subscription_status, subscription_current_period_end')
      .eq('user_id', params.userId)
      .single(),
    admin
      .from('subscription_usage')
      .select('feature, usage_count')
      .eq('user_id', params.userId)
      .in('feature', ['agent_chat', 'qscore_recalc', 'investor_connection']),
  ])

  const tier = (profile?.subscription_tier as string) ?? 'free'

  const usage: Record<string, number> = {}
  for (const row of usageRows ?? []) {
    usage[row.feature as string] = row.usage_count as number
  }

  // toDisplayLimit maps the UNLIMITED sentinel back to null, which the billing pages
  // render as "Unlimited". Founder and investor resolve their limits from different
  // constant maps — an investor's tier was previously always resolved against
  // FOUNDER_PLAN_LIMITS regardless of table, a latent bug that never triggered because
  // investor status never passed includeUsage: true until now.
  const usageOut: BillingUsage = params.table === 'founder_profiles'
    ? (() => {
        const limits = FOUNDER_PLAN_LIMITS[tier as FounderTier] ?? FOUNDER_PLAN_LIMITS.free
        return {
          agentChat:          { used: usage.agent_chat ?? 0,          limit: toDisplayLimit(limits.agent_chat)          },
          qscoreRecalc:       { used: usage.qscore_recalc ?? 0,       limit: toDisplayLimit(limits.qscore_recalc)       },
          investorConnection: { used: usage.investor_connection ?? 0, limit: toDisplayLimit(limits.investor_connection) },
        }
      })()
    : (() => {
        const limits = tier === 'pro' ? INVESTOR_PRO_LIMITS : INVESTOR_FREE_LIMITS
        const limit = limits.investor_connection ?? INVESTOR_FREE_LIMITS.investor_connection!
        return {
          investorConnection: { used: usage.investor_connection ?? 0, limit: toDisplayLimit(limit) },
        }
      })()

  return {
    subscriptionTier:   tier,
    subscriptionStatus: (profile?.subscription_status as string) ?? null,
    periodEnd:          (profile?.subscription_current_period_end as string) ?? null,
    usage: usageOut,
  }
}
