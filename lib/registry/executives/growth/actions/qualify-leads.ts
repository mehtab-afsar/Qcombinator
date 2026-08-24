import type { ActionDef } from '../../../types'

/**
 * qualify_leads — score and tier a batch of leads against the Customer
 * Acquisition Blueprint's Lead Scoring Framework (demographic fit,
 * behavioural signals, buying readiness).
 *
 * Internal analysis, not a live CRM write — there is no CRM Connector
 * registered (only gmail, slack, stripe, posthog are), and this Action's
 * deliverable is a scored list a human or a separate update_crm run still
 * has to apply. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 *
 * `dependsOn: 'follow_up_prospects'` — the AI SDR chain's next link: scoring/tiering reads the
 * actual follow-up plan just drafted (which itself already reflects the real reply
 * classification), rather than tiering the lead in isolation.
 */
export const QUALIFY_LEADS: ActionDef = {
  id: 'qualify_leads',
  program: 'P005',
  name: 'Qualify Leads',
  kind: 'oneoff',
  dependsOn: 'follow_up_prospects',
  irreversible: false,
  instructionsRef: 'qualify_leads',
}
