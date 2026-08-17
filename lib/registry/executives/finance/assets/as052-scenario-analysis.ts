import type { AssetDef } from '../../../types'

/**
 * AS052 — Scenario Analysis.
 *
 * ⚠️ NEWLY MINTED ID — not read off the workbook's Asset Registry sheet. See
 * `lib/registry/executives/finance/programs/p023-model.ts` for the full
 * reasoning behind AS049–AS053. This is a deliberate, authorized decision,
 * not an error.
 *
 * Workbook Program Registry names this Asset "Scenario Analysis" verbatim,
 * as one of P023 — Model's Primary Assets. No one-line description exists
 * for it beyond the name itself. Owned by P023; not shared with another
 * Program.
 */
export const AS052_SCENARIO_ANALYSIS: AssetDef = {
  id: 'AS052',
  name: 'Scenario Analysis',
  program: 'P023',
  outputSchema: 'markdown',
  instructionsRef: 'AS052',
}
