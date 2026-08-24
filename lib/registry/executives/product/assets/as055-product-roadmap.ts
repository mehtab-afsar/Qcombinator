import type { AssetDef } from '../../../types'

/**
 * AS055 — Product Roadmap.
 *
 * ⚠️ NEWLY MINTED ID — see AS054's header (same directory) for the full reasoning.
 *
 * Workbook Program Registry names this Asset "Product Roadmap" verbatim, as one of P016 —
 * Product's Primary Assets. Owned by P016; not shared with another Program.
 */
export const AS055_PRODUCT_ROADMAP: AssetDef = {
  id: 'AS055',
  name: 'Product Roadmap',
  program: 'P016',
  outputSchema: 'markdown',
  instructionsRef: 'AS055',
}
