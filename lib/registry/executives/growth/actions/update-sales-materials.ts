import type { ActionDef } from '../../../types'

/**
 * update_sales_materials — refresh a specific sales asset (deck section,
 * battle card, one-pager, objection response) against the current Sales
 * Enablement Kit and Proposal & ROI Toolkit.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here because the workbook doesn't resolve it:
 * this produces an updated DRAFT for the founder or sales lead to put into
 * use — it does not push anything into a live deck tool, CRM or shared
 * drive itself. No CMS/deck/CRM Connector exists yet, so `irreversible:
 * false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const UPDATE_SALES_MATERIALS: ActionDef = {
  id: 'update_sales_materials',
  name: 'Update Sales Materials',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_sales_materials',
}
