import type { ActionDef } from '../../../types'

/**
 * synthesize_customer_feedback — pull this cycle's customer feedback into a
 * single synthesis, producing the Product Feedback Log (AS046).
 *
 * Internal and reversible: a synthesis, not a live external effect. No
 * feedback-tool or analytics-write Connector is registered today (only
 * gmail, slack, gmail_read, stripe and posthog are — see
 * `lib/registry/types.ts`'s `ConnectorId` comment), so this produces a
 * written log rather than actually pulling live from a feedback tool.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from this Program's
 * own authored Action list (see p015-validate.ts).
 */
export const SYNTHESIZE_CUSTOMER_FEEDBACK: ActionDef = {
  id: 'synthesize_customer_feedback',
  name: 'Synthesize Customer Feedback',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'synthesize_customer_feedback',
}
