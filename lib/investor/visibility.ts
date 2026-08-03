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
