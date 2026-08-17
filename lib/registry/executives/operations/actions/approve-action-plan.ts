import type { ActionDef } from '../../../types'

/**
 * approve_action_plan — record the founder's sign-off on this cycle's
 * ranked action plan (the output of assign_priorities).
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan`, P002's
 * `approve_messaging` and P007's `approve_discounts` (see those files for the
 * full reasoning). `irreversible: false` is deliberate: this records a
 * decision already taken, it does not ask permission. Marking it `true`
 * would reintroduce the approval gate ADR-002 explicitly removed — the
 * founder sets direction once, via the Executive Contract, not per-plan.
 * Approval gates exist ONLY at the Connector boundary, on irreversible
 * external Actions — never on internal work like this one.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const APPROVE_ACTION_PLAN: ActionDef = {
  id: 'approve_action_plan',
  program: 'P009',
  name: 'Approve Action Plan',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_action_plan',
}
