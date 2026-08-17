import type { ActionDef } from '../../../types'

/**
 * prepare_customer_demo — produce a demonstration script for a specific
 * customer or segment, built on the Sales Enablement Kit's Product
 * Demonstration Framework.
 *
 * Internal preparation, not the demo itself — this produces a script and
 * talk track a rep still has to deliver live. No demo/screen-share Connector
 * exists (or would make sense) here, so `irreversible: false`, no
 * `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const PREPARE_CUSTOMER_DEMO: ActionDef = {
  id: 'prepare_customer_demo',
  program: 'P005',
  name: 'Prepare Customer Demo',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'prepare_customer_demo',
}
