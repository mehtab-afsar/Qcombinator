import type { ActionDef } from '../types'

/**
 * approve_gtm_plan — record the founder's sign-off on the GTM plan.
 *
 * ⚠️ THE NAME IS MISLEADING. "Approve" here does not mean an approval GATE.
 *
 * `irreversible: false` — and that is deliberate, not an oversight:
 *
 *  - `irreversible` means an **external side effect that cannot be undone**:
 *    send, publish, spend, change price (ADR-004). This Action sends nothing,
 *    spends nothing and leaves nothing outside the product. It records a
 *    decision.
 *  - Marking it `true` would make the system stop and ask the founder for
 *    permission to record the founder's own decision — which is circular.
 *  - More importantly it would reintroduce **the exact gate the PRD removed**.
 *    ADR-002: the founder sets direction ONCE via the Executive Contract; there
 *    is no per-plan sign-off, no proposed status, no waiting state. That gate was
 *    considered and explicitly rejected.
 *
 * The only checkpoint in this product is a just-in-time approval at the Connector
 * boundary, on irreversible external Actions. In P001 that is exactly one Action:
 * `interview_customers`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty. The name
 * comes from the Program Registry's free text; the reasoning from ADR-002/004.
 */
export const APPROVE_GTM_PLAN: ActionDef = {
  id: 'approve_gtm_plan',
  name: 'Approve GTM Plan',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'approve_gtm_plan',
}
