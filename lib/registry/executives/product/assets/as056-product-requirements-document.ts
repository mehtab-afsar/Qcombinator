import type { AssetDef } from '../../../types'

/**
 * AS056 — Product Requirements Document (PRD).
 *
 * ⚠️ NEWLY MINTED ID — see AS054's header (same directory) for the full reasoning.
 *
 * Workbook Program Registry names this Asset "Product Requirements Document (PRD)" verbatim, as
 * one of P016 — Product's Primary Assets. Owned by P016; not shared with another Program.
 */
export const AS056_PRODUCT_REQUIREMENTS_DOCUMENT: AssetDef = {
  id: 'AS056',
  name: 'Product Requirements Document',
  program: 'P016',
  outputSchema: 'markdown',
  instructionsRef: 'AS056',
}
