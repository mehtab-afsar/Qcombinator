import type { ActionDef } from '../../../types'

/**
 * launch_outreach — draft a first-touch outreach sequence (messages plus a
 * sending plan) for a prospect list, built on the Customer Acquisition
 * Blueprint's channel and lead-generation strategy.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here deliberately. The name reads like it
 * could mean sending real outbound email to real prospects — P001's
 * `interview_customers` is the proven pattern for exactly that: `irreversible:
 * true`, `connector: 'gmail'`, just-in-time founder approval at send (ADR-004).
 * This Action is built as draft-only instead: it produces the outreach copy
 * and a sequencing/channel plan, and does not send anything itself. Reasons:
 * (a) P001 already owns the one real "sends via Gmail to a real person" proof
 * case, and multiplying real-send actions across Programs is a safety-relevant
 * product decision, not a config detail, so it should not be made silently
 * inside a Program-authoring pass; (b) staying consistent with every other
 * Action authored in this batch. If real sending is wanted here, that is a
 * deliberate follow-up decision, not this file. `irreversible: false`, no
 * `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const LAUNCH_OUTREACH: ActionDef = {
  id: 'launch_outreach',
  name: 'Launch Outreach',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'launch_outreach',
}
