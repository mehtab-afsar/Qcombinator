import type { AssetDef } from '../../../types'

/**
 * AS015 — Customer Acquisition Blueprint.
 *
 * Workbook (Program Registry, P005 assets): the company's authoritative
 * customer acquisition system — AARRR funnel, Bullseye channel prioritisation,
 * HubSpot Flywheel, RevOps operating model, lead scoring and conversion
 * optimisation, from first awareness through to qualified opportunity. Owned
 * by P005 — Customer Acquisition. Not shared with another Program — P003's
 * Buyer Journey Map already lists AS015 as a downstream deliverable it feeds
 * (see as003.ts), but that is a narrative cross-reference, not a Registry
 * `sharedWith` relationship.
 */
export const AS015_CUSTOMER_ACQUISITION_BLUEPRINT: AssetDef = {
  id: 'AS015',
  name: 'Customer Acquisition Blueprint',
  program: 'P005',
  outputSchema: 'markdown',
  instructionsRef: 'AS015',
}
