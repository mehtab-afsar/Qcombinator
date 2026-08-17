import type { ActionDef } from '../../../types'

/**
 * identify_constraints — name the company's single biggest operational
 * constraint this cycle, drawn from the Founder Dashboard (AS019), KPI
 * Dashboard (AS020) and Q-Score Trend Report (AS021).
 *
 * Internal analysis, changes nothing external. `irreversible: false`, no
 * `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const IDENTIFY_CONSTRAINTS: ActionDef = {
  id: 'identify_constraints',
  name: 'Identify Constraints',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'identify_constraints',
}
