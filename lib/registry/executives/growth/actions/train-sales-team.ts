import type { ActionDef } from '../../../types'

/**
 * train_sales_team — produce a training session (agenda, content and
 * exercises) that brings the sales team up to date on the current Sales
 * Enablement Kit.
 *
 * Internal enablement content, not a live session — there is no LMS/training
 * Connector registered (only gmail, slack, stripe, posthog are —
 * lib/connectors/registry.ts), and this Action's deliverable is a
 * ready-to-run training plan a human still has to deliver. `irreversible:
 * false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const TRAIN_SALES_TEAM: ActionDef = {
  id: 'train_sales_team',
  program: 'P005',
  name: 'Train Sales Team',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'train_sales_team',
}
