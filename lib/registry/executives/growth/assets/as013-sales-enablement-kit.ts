import type { AssetDef } from '../../../types'

/**
 * AS013 — Sales Enablement Kit.
 *
 * Workbook (Program Registry, P004 assets): the company's authoritative
 * sales system — qualification frameworks (MEDDICC, BANT, GAP Selling),
 * discovery, presentation and demo structure, battle cards, objection
 * handling and proof library. Originally owned by P004 — Sales Enablement,
 * which was merged into P005 Customer Acquisition (Phase 10 Part 3, program
 * consolidation).
 */
export const AS013_SALES_ENABLEMENT_KIT: AssetDef = {
  id: 'AS013',
  name: 'Sales Enablement Kit',
  program: 'P005',
  outputSchema: 'markdown',
  instructionsRef: 'AS013',
}
