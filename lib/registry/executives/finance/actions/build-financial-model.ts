import type { ActionDef } from '../../../types'

/**
 * build_financial_model — build or refresh the company's core Financial
 * Model (AS049) from current Company Context and the latest Q-Score.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from P023's own
 * authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 *
 * Internal and reversible: produces an updated model document, no external
 * side effect. No connector is registered for financial-modelling tooling
 * today. Runs autonomously (ADR-004).
 */
export const BUILD_FINANCIAL_MODEL: ActionDef = {
  id: 'build_financial_model',
  program: 'P023',
  name: 'Build Financial Model',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'build_financial_model',
}
