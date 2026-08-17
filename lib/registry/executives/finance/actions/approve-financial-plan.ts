import type { ActionDef } from '../../../types'

/**
 * approve_financial_plan — record the founder's sign-off on this cycle's
 * financial plan (Financial Model, Budget, Cash Flow Forecast and Scenario
 * Analysis, taken together), the output of build_financial_model,
 * update_budget and run_scenario_analysis.
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan`, P002's
 * `approve_messaging`, P007's `approve_discounts`, P009's
 * `approve_action_plan` and P015's `approve_validation_roadmap` (see those
 * files for the full reasoning). `irreversible: false` is deliberate: this
 * records a decision already taken, it does not ask permission. Marking it
 * `true` would reintroduce the approval gate ADR-002 explicitly removed —
 * the founder sets direction once, via the Executive Contract, not per plan.
 * Approval gates exist ONLY at the Connector boundary, on irreversible
 * external Actions — never on internal work like this one.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from P023's own
 * authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const APPROVE_FINANCIAL_PLAN: ActionDef = {
  id: 'approve_financial_plan',
  program: 'P023',
  name: 'Approve Financial Plan',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_financial_plan',
}
