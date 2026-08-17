import type { ActionDef } from '../../../types'

/**
 * update_crm — recommend pipeline-stage and record updates for a set of
 * leads/opportunities, built on the Customer Acquisition Blueprint's CRM
 * Strategy (pipeline stages, lifecycle, data quality standards).
 *
 * Internal recommendation, not a live write — there is no CRM Connector
 * registered (only gmail, slack, stripe, posthog are), and this Action's
 * deliverable is a set of proposed record/stage changes a human still has to
 * apply in the CRM itself. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const UPDATE_CRM: ActionDef = {
  id: 'update_crm',
  program: 'P005',
  name: 'Update CRM',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_crm',
}
