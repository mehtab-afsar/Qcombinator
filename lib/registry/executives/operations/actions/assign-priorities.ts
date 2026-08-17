import type { ActionDef } from '../../../types'

/**
 * assign_priorities — rank this cycle's execution priorities against the
 * constraint named by identify_constraints, producing a short ordered list
 * the founder can act on.
 *
 * Internal document, not a live task-assignment write — no project-management
 * Connector is registered (only gmail, slack, gmail_read, stripe and posthog
 * are; see `lib/registry/types.ts`'s `ConnectorId` comment). `irreversible:
 * false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const ASSIGN_PRIORITIES: ActionDef = {
  id: 'assign_priorities',
  name: 'Assign Priorities',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'assign_priorities',
}
