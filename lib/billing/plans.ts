/**
 * Plan & usage limits — the single source of truth.
 *
 * Before Phase 0 these numbers were duplicated across four call sites (the
 * Stripe webhook, signup, the auth callback, and the billing-status route) and
 * had already drifted in how they expressed "unlimited". CLAUDE.md §4: one
 * source of truth per fact.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  `null` MEANS OPPOSITE THINGS IN THE TWO LAYERS. Read this before changing
 *     anything here.
 *
 *   DATABASE  — `subscription_usage.limit_count` is nullable, and the
 *               enforcement RPC does `COALESCE(v_row.limit_count, 50)`
 *               (20260512000003_increment_usage_rpc.sql:48). So a NULL
 *               limit_count is enforced as **50 — the FREE cap**, not as
 *               unlimited. Writing NULL for a premium founder would silently
 *               throttle a paying customer to the free tier.
 *
 *   UI        — `app/founder/billing/page.tsx:52` renders
 *               `limit === null ? 'Unlimited' : `${used} of ${limit}``.
 *               So NULL displays as **"Unlimited"**.
 *
 * Hence UNLIMITED is a large sentinel written to the DB, and `toDisplayLimit()`
 * converts it to null at the API boundary. Do NOT "simplify" by storing null.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The DB sentinel for "no practical limit".
 *
 * Must stay a real number — see the warning above. The enforcement RPC compares
 * `usage_count >= limit_count`, so any value far above real usage works; this
 * one is the value already in production.
 */
export const UNLIMITED = 999_999

/** Features metered in `subscription_usage`. Mirrors the table's CHECK constraint. */
export type MeteredFeature = 'agent_chat' | 'qscore_recalc' | 'investor_connection'

export type FounderTier = 'free' | 'premium'

/**
 * Founder limits per tier, as written to `subscription_usage.limit_count`.
 *
 * NOTE: the free `agent_chat` value (50) is ALSO hardcoded in SQL — the RPC's
 * default insert (`:24`) and its COALESCE fallback (`:48`). Those cannot import
 * from TypeScript. If this number changes, that migration must change too.
 */
export const FOUNDER_PLAN_LIMITS: Record<FounderTier, Record<MeteredFeature, number>> = {
  free: {
    agent_chat:          50,
    qscore_recalc:       2,
    investor_connection: 3,
  },
  premium: {
    agent_chat:          500,
    qscore_recalc:       UNLIMITED,
    investor_connection: UNLIMITED,
  },
}

/**
 * Investor limits. Investors are only metered on deal-flow connections — the
 * other two features don't apply to them at all.
 */
export const INVESTOR_FREE_LIMITS: Partial<Record<MeteredFeature, number>> = {
  investor_connection: 3,
}
export const INVESTOR_PRO_LIMITS: Partial<Record<MeteredFeature, number>> = {
  investor_connection: UNLIMITED,
}

/**
 * Convert a stored limit into its API/UI form: the sentinel becomes null, which
 * the billing page renders as "Unlimited".
 */
export function toDisplayLimit(limit: number): number | null {
  return limit === UNLIMITED ? null : limit
}

/**
 * One month from today, as an ISO string — the `subscription_usage.reset_at` value
 * written when a new usage row is seeded at signup. Was duplicated identically in
 * app/auth/callback/route.ts and app/api/auth/signup/route.ts; single-sourced here.
 */
export function getNextMonthDate(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
}
