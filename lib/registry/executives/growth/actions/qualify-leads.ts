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
 */
export const QUALIFY_LEADS: ActionDef = {
  id: 'qualify_leads',
  program: 'P005',
  name: 'Qualify Leads',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'qualify_leads',
}
