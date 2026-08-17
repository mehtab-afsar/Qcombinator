import type { ActionDef } from '../../../types'

/**
 * follow_up_prospects — draft the next follow-up message(s) for prospects
 * already in outreach, based on where each stands in the Customer
 * Acquisition Blueprint's funnel.
 *
 * ⚠️ SAME JUDGEMENT CALL AS launch_outreach.ts — read that file first. This
 * Action's name also reads like it could mean sending a real message to a
 * real prospect, and P001's `interview_customers` is where that pattern
 * already lives (`irreversible: true`, `connector: 'gmail'`, ADR-004). This
 * Action is built draft-only on purpose: it produces the next follow-up
 * message and timing recommendation, and does not send it. Same two reasons —
 * P001 already owns the one real Gmail-send proof case, and consistency with
 * the rest of this batch. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const FOLLOW_UP_PROSPECTS: ActionDef = {
  id: 'follow_up_prospects',
  name: 'Follow-up Prospects',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'follow_up_prospects',
}
