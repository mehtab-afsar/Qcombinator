import type { ActionDef } from '../../../types'

/**
 * review_win_loss_feedback — hold recent won/lost opportunities against the
 * Sales Enablement Kit's qualification criteria and Objection Handling
 * Guide, and report where the sales system is or isn't holding up.
 *
 * Internal analysis. Reads Company Context and AS013's frameworks, touches
 * nothing outside the product, so it runs autonomously — approval gates
 * exist ONLY at the Connector boundary, never on internal work (ADR-002,
 * ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const REVIEW_WIN_LOSS_FEEDBACK: ActionDef = {
  id: 'review_win_loss_feedback',
  name: 'Review Win/Loss Feedback',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_win_loss_feedback',
}
