import type { ActionDef } from '../../../types'

/**
 * review_pricing — assess the company's current pricing and packaging
 * against the Pricing & Packaging Strategy (AS017) and produce a findings
 * report: what is working, what is off-value, what should change.
 *
 * Internal analysis, not a live price change — there is no `connector.send()`
 * -style capability wired to Stripe (only read/sync — billing status), so
 * this Action produces a recommendation for the founder to act on manually.
 * `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const REVIEW_PRICING: ActionDef = {
  id: 'review_pricing',
  program: 'P001',
  name: 'Review Pricing',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_pricing',
}
