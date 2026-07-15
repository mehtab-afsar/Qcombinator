import type { ActionDef } from '../types'

/**
 * validate_icps — check the ICP Profiles against current company evidence.
 *
 * Internal analysis. Touches nothing outside the product, so it runs
 * autonomously: approval gates exist ONLY at the Connector boundary, never on
 * internal work (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty. The name
 * comes from the Program Registry; the flags from PRD §10.
 */
export const VALIDATE_ICPS: ActionDef = {
  id: 'validate_icps',
  name: 'Validate ICPs',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'validate_icps',
}
