import type { AssetDef } from '../../../types'

/**
 * AS054 — Product Vision.
 *
 * ⚠️ NEWLY MINTED ID — same situation and same precedent as AS043–AS048 (P015 — Validate) and
 * AS049–AS053 (P023 — Model): the workbook's Asset Registry sheet never assigned P016 real ids,
 * only names in prose (see `lib/registry/executives/product/programs/p016-product.ts`). AS001–
 * AS053 are all already assigned, so AS054 is the next available id.
 *
 * Workbook Program Registry names this Asset "Product Vision" verbatim, as one of P016 —
 * Product's Primary Assets. Owned by P016; not shared with another Program.
 */
export const AS054_PRODUCT_VISION: AssetDef = {
  id: 'AS054',
  name: 'Product Vision',
  program: 'P016',
  outputSchema: 'markdown',
  instructionsRef: 'AS054',
}
