import type { ActionDef } from '../../../types'

/**
 * approve_discounts — record the discount governance the company is now
 * operating to (approval levels, maximum thresholds, prohibited discounting),
 * per AS017's Discount Policy section.
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan` and
 * P002's `approve_messaging` (see those files for the full reasoning).
 * `irreversible: false` is deliberate: this records a governance decision
 * already taken, it does not ask permission or approve any individual
 * discount transaction. Marking it `true` would reintroduce the approval
 * gate ADR-002 explicitly removed — the founder sets direction once, via the
 * Executive Contract, not per-discount. It is also not a Stripe-backed
 * action: no `connector.send()`-style capability exists to apply a discount
 * to a live price (see review-pricing.ts's and test-new-pricing.ts's
 * comments on the Stripe connector being read/sync only).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const APPROVE_DISCOUNTS: ActionDef = {
  id: 'approve_discounts',
  name: 'Approve Discounts',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_discounts',
}
