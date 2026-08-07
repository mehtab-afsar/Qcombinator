import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * An investor's real auth user_id, given a `demo_investor_id` (the founder-facing
 * "claimed" demo identity a real investor account can be linked to).
 */
export async function resolveDemoInvestorUserId(
  admin: SupabaseClient,
  demoInvestorId: string | null,
): Promise<string | null> {
  if (!demoInvestorId) return null
  const { data } = await admin
    .from('investor_profiles')
    .select('user_id')
    .eq('demo_investor_id', demoInvestorId)
    .maybeSingle()
  return data?.user_id ?? null
}

/**
 * The other direction: this investor's own `demo_investor_id`, given their user_id.
 * Most `connection_requests` rows are keyed to `demo_investor_id`, not `investor_id`
 * (a founder-initiated connection lands on the former; investor-initiated outreach on
 * the latter) — every read/write against that table needs this lookup first.
 */
export async function getMyDemoInvestorId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('investor_profiles')
    .select('demo_investor_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.demo_investor_id ?? null
}

/**
 * A `connection_requests` row may be keyed to either FK column — build a Postgrest
 * `.or()` filter that matches whichever one this investor actually has.
 */
export function investorConnectionOrFilter(userId: string, demoInvestorId: string | null): string {
  return demoInvestorId
    ? `demo_investor_id.eq.${demoInvestorId},investor_id.eq.${userId}`
    : `investor_id.eq.${userId}`
}

/** Is this investor a party to a specific connection row, via either FK? */
export function isInvestorPartyToConnection(
  conn: { investor_id: string | null; demo_investor_id: string | null },
  userId: string,
  demoInvestorId: string | null,
): boolean {
  return conn.investor_id === userId || Boolean(demoInvestorId && conn.demo_investor_id === demoInvestorId)
}
