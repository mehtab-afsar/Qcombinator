import type { ActionDef } from '../../../types'

/**
 * test_new_pricing — design a structured pricing experiment (hypothesis,
 * segment, mechanism, success criteria) to validate a proposed pricing or
 * packaging change before it goes live.
 *
 * ⚠️ Produces a TEST PLAN, not a live price change. CLAUDE.md and
 * `ActionDef.irreversible`'s own doc comment list "change price" as the
 * textbook irreversible example, and a Stripe connector IS registered — but
 * that connector is read/sync only (billing status); there is no
 * `connector.send()`-style capability to actually change a live price today
 * (see `lib/registry/types.ts`'s `ConnectorId` comment: stripe is never used
 * as an `ActionDef.connector`). This Action stops at an experiment design a
 * human still has to execute. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const TEST_NEW_PRICING: ActionDef = {
  id: 'test_new_pricing',
  name: 'Test New Pricing',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'test_new_pricing',
}
