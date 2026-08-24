import type { AssetDef } from '../../../types'

/**
 * AS058 — Product Backlog.
 *
 * ⚠️ NEWLY MINTED ID — see AS054's header (same directory) for the full reasoning.
 *
 * Workbook Program Registry names this Asset "Product Backlog" verbatim, as one of P016 —
 * Product's Primary Assets. Owned by P016; not shared with another Program.
 */
export const AS058_PRODUCT_BACKLOG: AssetDef = {
  id: 'AS058',
  name: 'Product Backlog',
  program: 'P016',
  outputSchema: 'markdown',
  instructionsRef: 'AS058',
}
