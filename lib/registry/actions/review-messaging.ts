import type { ActionDef } from '../types'

/**
 * review_messaging — review positioning and messaging against evidence.
 *
 * Internal. Reads and critiques AS004; publishes nothing. Reversible, so no
 * approval (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const REVIEW_MESSAGING: ActionDef = {
  id: 'review_messaging',
  name: 'Review Messaging',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_messaging',
}
