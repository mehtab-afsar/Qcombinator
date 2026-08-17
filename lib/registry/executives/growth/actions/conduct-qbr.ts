import type { ActionDef } from '../../../types'

/**
 * conduct_qbr — produce a Quarterly Business Review presentation (objectives,
 * KPI review, value delivered, challenges, expansion opportunities, agreed
 * next steps) for a customer, built on the Customer Success Framework's QBR
 * methodology.
 *
 * Internal deliverable, not a live meeting — there is no calendar/meeting
 * Connector registered (only gmail, slack, stripe, posthog are —
 * lib/connectors/registry.ts), and this Action's output is a QBR document a
 * human still has to present. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const CONDUCT_QBR: ActionDef = {
  id: 'conduct_qbr',
  program: 'P006',
  name: 'Conduct QBR',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'conduct_qbr',
}
