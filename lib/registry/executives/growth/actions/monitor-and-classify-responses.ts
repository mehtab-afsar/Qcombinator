import type { ActionDef } from '../../../types'

/**
 * monitor_and_classify_responses — review what is known about replies to
 * outreach already sent (Company Context / prior cycle results) and
 * classify interest level per lead, recommending the next step.
 *
 * Internal analysis, not a live inbox read — there is no email-monitoring
 * read access wired to this Action (gmail_read exists in the Connector
 * registry for other purposes, but is not granted here); this Action works
 * from whatever reply information has already been captured, not a live
 * feed. `irreversible: false`, no `connector`.
 *
 * Genuinely new capability — nothing like it existed on P005 before this
 * restructuring. Sits after generate_personalized_outreach and before
 * follow_up_prospects/qualify_leads in P005's actions array, routing each
 * lead to whichever comes next.
 */
export const MONITOR_AND_CLASSIFY_RESPONSES: ActionDef = {
  id: 'monitor_and_classify_responses',
  program: 'P005',
  name: 'Monitor & Classify Responses',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_and_classify_responses',
}
