import type { ActionDef } from '../../../types'

/**
 * run_scenario_analysis — stress-test the Financial Model (AS049) against
 * best-case, base-case and downside assumptions, producing or updating the
 * Scenario Analysis (AS052).
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from P023's own
 * authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 *
 * Internal and reversible: produces an updated analysis document, no
 * external side effect. Runs autonomously (ADR-004).
 */
export const RUN_SCENARIO_ANALYSIS: ActionDef = {
  id: 'run_scenario_analysis',
  program: 'P023',
  name: 'Run Scenario Analysis',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'run_scenario_analysis',
}
