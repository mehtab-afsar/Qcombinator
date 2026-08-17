import type { ActionDef } from '../../../types'

/**
 * generate_lead_lists — produce a prioritised list of prospect
 * companies/contacts matching the ICP, built on the Customer Acquisition
 * Blueprint's channel and lead-scoring frameworks.
 *
 * Internal research output, not a live data pull — there is no
 * prospecting/data-enrichment Connector registered (only gmail, slack,
 * stripe, posthog are — lib/connectors/registry.ts), and this Action's
 * deliverable is a list a human still has to load into outreach tooling or
 * the CRM. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const GENERATE_LEAD_LISTS: ActionDef = {
  id: 'generate_lead_lists',
  name: 'Generate Lead Lists',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'generate_lead_lists',
}
