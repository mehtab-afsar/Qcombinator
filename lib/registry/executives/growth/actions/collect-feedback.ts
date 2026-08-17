import type { ActionDef } from '../../../types'

/**
 * collect_feedback — produce a customer feedback collection plan (which
 * stage of the lifecycle to survey, questions to ask, channel) built on the
 * Customer Success Framework's Customer Feedback Framework.
 *
 * Internal plan, not a live survey send — there is no survey/feedback-tool
 * Connector registered (only gmail, slack, stripe, posthog are —
 * lib/connectors/registry.ts), and this Action's deliverable is a
 * ready-to-run collection plan a human still has to send out.
 * `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const COLLECT_FEEDBACK: ActionDef = {
  id: 'collect_feedback',
  name: 'Collect Feedback',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'collect_feedback',
}
