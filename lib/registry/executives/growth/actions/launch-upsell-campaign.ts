import type { ActionDef } from '../../../types'

/**
 * launch_upsell_campaign — identify expansion-ready customers and draft an
 * upsell/cross-sell campaign plan (target accounts, offer, messaging,
 * sequencing) built on the Customer Success Framework's Expansion Strategy
 * and Net Revenue Retention approach.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here deliberately. "Launch" reads like it
 * could mean sending real commercial outreach to real customers — P001's
 * `interview_customers` is the proven pattern for exactly that: `irreversible:
 * true`, `connector: 'gmail'`, just-in-time founder approval at send
 * (ADR-004). This Action is built as plan-only instead: it identifies
 * expansion targets and drafts the campaign, and does not send or commit to
 * a price/discount itself. Reasons: (a) P001 already owns the one real
 * "sends via Gmail to a real person" proof case, and multiplying real-send
 * actions across Programs is a safety-relevant product decision, not a
 * config detail, so it should not be made silently inside a Program-authoring
 * pass; (b) staying consistent with P005's launch_outreach and
 * follow_up_prospects, the closest prior examples of this exact naming trap;
 * (c) an upsell campaign also implies commercial terms (pricing, discounting)
 * which the Program Prompt itself flags as needing Founder involvement — a
 * plan-only Action keeps that judgement with the Founder rather than
 * pre-committing to an offer. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const LAUNCH_UPSELL_CAMPAIGN: ActionDef = {
  id: 'launch_upsell_campaign',
  name: 'Launch Upsell Campaign',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'launch_upsell_campaign',
}
