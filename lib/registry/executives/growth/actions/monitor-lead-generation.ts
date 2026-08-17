import type { ActionDef } from '../../../types'

/**
 * monitor_lead_generation — review lead volume, source mix and conversion
 * against the Campaign Strategy's KPIs and report where the demand engine is
 * under- or over-performing.
 *
 * Internal analysis. Reads Company Context and AS012's success metrics,
 * touches nothing outside the product, so it runs autonomously — approval
 * gates exist ONLY at the Connector boundary, never on internal work
 * (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const MONITOR_LEAD_GENERATION: ActionDef = {
  id: 'monitor_lead_generation',
  program: 'P003',
  name: 'Monitor Lead Generation',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_lead_generation',
}
