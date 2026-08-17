import type { AssetDef } from '../../../types'

/**
 * AS050 — Budget.
 *
 * ⚠️ NEWLY MINTED ID — not read off the workbook's Asset Registry sheet. See
 * `lib/registry/executives/finance/programs/p023-model.ts` for the full
 * reasoning behind AS049–AS053. This is a deliberate, authorized decision,
 * not an error.
 *
 * Workbook Program Registry names this Asset "Budget" verbatim, as one of
 * P023 — Model's Primary Assets. No one-line description exists for it
 * beyond the name itself. Owned by P023; not shared with another Program.
 */
export const AS050_BUDGET: AssetDef = {
  id: 'AS050',
  name: 'Budget',
  program: 'P023',
  outputSchema: 'markdown',
  instructionsRef: 'AS050',
}
