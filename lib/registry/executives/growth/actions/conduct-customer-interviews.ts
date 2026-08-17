import type { ActionDef } from '../../../types'

/**
 * conduct_customer_interviews — produce a structured interview guide and,
 * where interview notes already exist in Company Context, a synthesis of
 * findings for the Customer Insights section of the Market Intelligence
 * Report (AS018).
 *
 * ⚠️ NAME COLLISION WITH P001's `interview_customers` — READ BEFORE CHANGING.
 * P001's `interview_customers` is the product's one deliberate real-send
 * proof case: `irreversible: true, connector: 'gmail'` (PRD §10). This
 * Action's name looks like the same thing, but it is not: it produces an
 * interview guide and a synthesis of what has already been learned, not an
 * outbound email scheduling real customer interviews. Multiplying real
 * external sends by name-matching across Programs is a safety-relevant
 * product decision, not something to infer from a workbook action name — see
 * P005's `launch_outreach`/`follow_up_prospects` and P006's
 * `launch_upsell_campaign` for the same judgement call made the same way.
 * `irreversible: false`, no `connector`, same as every other Action in this
 * Program.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const CONDUCT_CUSTOMER_INTERVIEWS: ActionDef = {
  id: 'conduct_customer_interviews',
  name: 'Conduct Customer Interviews',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'conduct_customer_interviews',
}
