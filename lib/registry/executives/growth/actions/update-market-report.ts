import type { ActionDef } from '../../../types'

/**
 * update_market_report — refresh the Market Intelligence Report (AS018)
 * with what has changed since the last version: new competitor moves,
 * customer insights and market trends surfaced by this Program's other
 * three Actions.
 *
 * Internal document update, not a publication — the report stays inside the
 * product for the Founder and Executive Team; there is no publishing
 * Connector involved. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const UPDATE_MARKET_REPORT: ActionDef = {
  id: 'update_market_report',
  program: 'P008',
  name: 'Update Market Report',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_market_report',
}
