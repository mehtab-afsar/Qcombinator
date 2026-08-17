import type { AssetDef } from '../../../types'

/**
 * AS016 — Customer Success Framework.
 *
 * Workbook (Program Registry, P006 assets): the company's authoritative
 * customer success system — lifecycle (onboarding through advocacy),
 * customer health scoring, QBR methodology, customer journey mapping and
 * Net Revenue Retention strategy, from the moment the contract is signed.
 * Owned by P006 — Customer Success. Not shared with another Program.
 */
export const AS016_CUSTOMER_SUCCESS_FRAMEWORK: AssetDef = {
  id: 'AS016',
  name: 'Customer Success Framework',
  program: 'P006',
  outputSchema: 'markdown',
  instructionsRef: 'AS016',
}
