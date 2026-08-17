import type { ActionDef } from '../../../types'

/**
 * approve_messaging — record the founder's sign-off on the current brand
 * messaging.
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan` (see that
 * file for the full reasoning). `irreversible: false` is deliberate: this
 * records a decision already taken, it does not ask permission. Marking it
 * `true` would reintroduce the approval gate ADR-002 explicitly removed — the
 * founder sets direction once, via the Executive Contract, not per-plan.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const APPROVE_MESSAGING: ActionDef = {
  id: 'approve_messaging',
  name: 'Approve Messaging',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_messaging',
}
