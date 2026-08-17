import type { ActionDef } from '../../../types'

/**
 * approve_validation_roadmap — record the founder's sign-off on this cycle's
 * Validation Roadmap (AS048), the output of prioritize_features and
 * validate_customer_problem.
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan`, P002's
 * `approve_messaging`, P007's `approve_discounts` and P009's
 * `approve_action_plan` (see those files for the full reasoning).
 * `irreversible: false` is deliberate: this records a decision already
 * taken, it does not ask permission. Marking it `true` would reintroduce the
 * approval gate ADR-002 explicitly removed — the founder sets direction once,
 * via the Executive Contract, not per-roadmap. Approval gates exist ONLY at
 * the Connector boundary, on irreversible external Actions — never on
 * internal work like this one.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from this Program's
 * own authored Action list (see p015-validate.ts).
 */
export const APPROVE_VALIDATION_ROADMAP: ActionDef = {
  id: 'approve_validation_roadmap',
  name: 'Approve Validation Roadmap',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_validation_roadmap',
}
