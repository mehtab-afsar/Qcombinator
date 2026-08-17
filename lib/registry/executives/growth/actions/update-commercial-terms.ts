import type { ActionDef } from '../../../types'

/**
 * update_commercial_terms — produce the updated commercial terms record
 * (contract language, pricing terms, discount/renewal clauses) that follows
 * from a Pricing & Packaging Strategy (AS017) change.
 *
 * Internal document, not a live contract execution or a Stripe price change
 * — there is no contract/CLM Connector registered, and Stripe's registered
 * connector is read/sync only (billing status), not a `connector.send()`
 * -style write capability. This Action drafts the terms a human still has to
 * put into contracts. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const UPDATE_COMMERCIAL_TERMS: ActionDef = {
  id: 'update_commercial_terms',
  name: 'Update Commercial Terms',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_commercial_terms',
}
