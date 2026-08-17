import type { AssetDef } from '../../../types'

/**
 * AS047 — Feature Prioritisation Matrix.
 *
 * ⚠️ NEWLY MINTED ID — see AS043's header (same file directory) and
 * `lib/registry/executives/product/programs/p015-validate.ts` for the full
 * reasoning: the workbook's Asset Registry sheet never assigned P015 a real
 * id, and the founder explicitly authorized minting AS043–AS048 now. This is
 * a deliberate, authorized decision, not an error.
 *
 * Workbook Program Registry names this Asset "Feature Prioritisation Matrix"
 * verbatim, as one of P015 — Validate's Primary Assets. No one-line
 * description exists for it beyond the name itself. Owned by P015; not
 * shared with another Program.
 */
export const AS047_FEATURE_PRIORITISATION_MATRIX: AssetDef = {
  id: 'AS047',
  name: 'Feature Prioritisation Matrix',
  program: 'P015',
  outputSchema: 'markdown',
  instructionsRef: 'AS047',
}
