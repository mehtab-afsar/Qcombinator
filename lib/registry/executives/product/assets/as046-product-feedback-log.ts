import type { AssetDef } from '../../../types'

/**
 * AS046 — Product Feedback Log.
 *
 * ⚠️ NEWLY MINTED ID — see AS043's header (same file directory) and
 * `lib/registry/executives/product/programs/p015-validate.ts` for the full
 * reasoning: the workbook's Asset Registry sheet never assigned P015 a real
 * id, and the founder explicitly authorized minting AS043–AS048 now. This is
 * a deliberate, authorized decision, not an error.
 *
 * Workbook Program Registry names this Asset "Product Feedback Log" verbatim,
 * as one of P015 — Validate's Primary Assets. No one-line description exists
 * for it beyond the name itself. Owned by P015; not shared with another
 * Program.
 */
export const AS046_PRODUCT_FEEDBACK_LOG: AssetDef = {
  id: 'AS046',
  name: 'Product Feedback Log',
  program: 'P015',
  outputSchema: 'markdown',
  instructionsRef: 'AS046',
}
