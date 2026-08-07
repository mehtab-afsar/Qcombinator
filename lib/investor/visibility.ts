import type { createAdminClient } from '@/lib/supabase/server'

/**
 * Enforces founder_profiles.visibility_gated on investor routes that accept a
 * client-supplied founderId directly (deep-dive, chat, memo, share, readiness).
 *
 * The deal-flow LIST already filters gated founders out; these direct-access
 * routes did not — any investor holding a founder's user_id (from watchlist
 * history, pipeline, a shared link, or enumeration) could bypass the gate
 * entirely (docs/INVESTOR_AUDIT.md §2, finding H-1). This closes that gap
 * uniformly across every route that takes a founderId param.
 *
 * Returns false for both "founder does not exist" and "founder is gated" —
 * the caller should respond 404 either way, so a gated founder's existence is
 * never confirmed to an investor who guessed or enumerated the id.
 */
export async function isFounderVisible(
  admin: ReturnType<typeof createAdminClient>,
  founderId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('founder_profiles')
    .select('visibility_gated')
    .eq('user_id', founderId)
    .maybeSingle()
  if (!data) return false
  return data.visibility_gated !== true
}

/**
 * Resolves the connection_requests.status between an investor and a founder,
 * or null if no request exists between them at all.
 *
 * Most investors are linked through a "claimed" demo_investor row rather than
 * a real investor_id — connection_requests.investor_id is NULL for those, so
 * this also matches on investor_profiles.demo_investor_id, the same
 * resolution used by app/api/messages/route.ts for the same reason.
 */
export async function getConnectionStatus(
  admin: ReturnType<typeof createAdminClient>,
  investorUserId: string,
  founderId: string,
): Promise<string | null> {
  const { data: ip } = await admin
    .from('investor_profiles')
    .select('demo_investor_id')
    .eq('user_id', investorUserId)
    .maybeSingle()

  const orFilter = ip?.demo_investor_id
    ? `investor_id.eq.${investorUserId},demo_investor_id.eq.${ip.demo_investor_id}`
    : `investor_id.eq.${investorUserId}`

  const { data: conn } = await admin
    .from('connection_requests')
    .select('status')
    .eq('founder_id', founderId)
    .or(orFilter)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return conn?.status ?? null
}

/** A connection unlocks full founder data once it's been accepted (or a meeting's been scheduled off it). */
export function isConnectedStatus(status: string | null): boolean {
  return status === 'accepted' || status === 'meeting_scheduled'
}
