/**
 * Connected-account data, rendered as Company Context text — the first time a founder's own
 * connected numbers reach their own executives.
 *
 * ⚠️ THE GAP THIS CLOSES (docs/AGI_ACTIONS_PRD.md; ADR-038). Stripe's connector has always
 * written `stripe_mrr`/`stripe_arr`/`stripe_customers`/`stripe_last30` onto `founder_profiles` at
 * connect time. Those columns reach the founder's dashboard, admin metrics, and investor
 * deal-flow — but never the prompts. So the product would show a founder their verified MRR on
 * one screen while their CFO's Financial Model (AS049) wrote `[TO VALIDATE: …]` next to it.
 *
 * ⚠️ THIS IS A DATABASE READ, NOT A CONNECTOR CALL, and that distinction is load-bearing. The
 * numbers were synced when the founder connected Stripe; nothing here talks to Stripe. A cycle
 * using this makes no external call, spends nothing, and does not care whether Stripe is up — so
 * ADR-026's "no Connectors inside a cycle" is not engaged at all.
 *
 * ⚠️ CONTEXT, NEVER A TRIGGER. This must not be wired into `lib/rhythm/delta.ts`. A signal there
 * flips `hasNewInput` and would make Stripe movement *cause* asset regeneration — squarely inside
 * ADR-028's decided territory (a cycle is fed by a founder-activity delta). Feeding an asset
 * that is being generated anyway is a different thing from deciding what gets generated.
 * `__tests__/stripe-context.test.ts` guards that line.
 *
 * Mirrors `lib/contacts/context.ts` and `lib/comparables/retrieve.ts` exactly: same signature
 * shape, `null` rather than a throw on any failure, and the caller wraps in `.catch(() => null)`
 * regardless — a metrics lookup must never break a cycle.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface StripeMetricsRow {
  stripe_verified: boolean | null
  stripe_mrr: number | null
  stripe_arr: number | null
  stripe_customers: number | null
  stripe_last30: number | null
  stripe_verified_at: string | null
}

/** Whole dollars, as Stripe's own sync stores them. */
function money(value: number): string {
  return `$${value.toLocaleString('en-US')}`
}

export async function getStripeMetricsContext(
  admin: SupabaseClient,
  founderId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('founder_profiles')
    .select('stripe_verified, stripe_mrr, stripe_arr, stripe_customers, stripe_last30, stripe_verified_at')
    .eq('user_id', founderId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as StripeMetricsRow

  // Unverified means the connection never completed a real sync. An unverified figure must never
  // reach a prompt, because everything downstream will treat what lands here as fact — the whole
  // point of preferring this over the founder's self-reported numbers.
  if (row.stripe_verified !== true) return null

  const lines = [
    row.stripe_mrr != null ? `Monthly recurring revenue: ${money(row.stripe_mrr)}` : null,
    row.stripe_arr != null ? `Annual recurring revenue: ${money(row.stripe_arr)}` : null,
    row.stripe_customers != null ? `Paying customers: ${row.stripe_customers.toLocaleString('en-US')}` : null,
    row.stripe_last30 != null ? `Collected in the last 30 days: ${money(row.stripe_last30)}` : null,
  ].filter((line): line is string => line !== null)

  // Verified but empty (a connected account with no revenue yet) is a real state and NOT the same
  // as "no data" — but there is nothing to tell the model, and an empty section would read as a
  // gap rather than a zero. Say nothing rather than render a heading with no facts under it.
  if (lines.length === 0) return null

  return [
    'Read directly from this founder\'s connected Stripe account — verified payment data, not',
    'self-reported. Prefer these figures over any revenue number stated elsewhere in this context,',
    'and never contradict them.',
    row.stripe_verified_at ? `Last synced: ${row.stripe_verified_at.slice(0, 10)}.` : null,
    '',
    ...lines,
  ].filter((line): line is string => line !== null).join('\n')
}
