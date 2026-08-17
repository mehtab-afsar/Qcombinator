import type { ActionDef } from '../../../types'

/**
 * update_budget — refresh the company's Budget (AS050) against actuals and
 * the current Financial Model (AS049).
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from P023's own
 * authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 *
 * Internal and reversible: produces an updated budget document, no external
 * side effect. No accounting-system or spend-tracking Connector is
 * registered today. Runs autonomously (ADR-004).
 */
export const UPDATE_BUDGET: ActionDef = {
  id: 'update_budget',
  program: 'P023',
  name: 'Update Budget',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_budget',
}
