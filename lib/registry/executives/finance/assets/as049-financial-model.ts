import type { AssetDef } from '../../../types'

/**
 * AS049 — Financial Model.
 *
 * ⚠️ NEWLY MINTED ID — not read off the workbook's Asset Registry sheet.
 * Every Asset id seeded before P023 came directly from that sheet; this one,
 * and AS050–AS053 alongside it, did not — the sheet never assigned P023 a
 * single real id (its last real assignment was AS048, minted for Product's
 * P015). The founder was asked directly and explicitly chose to assign new
 * ids now, sequentially from AS049. See
 * `lib/registry/executives/finance/programs/p023-model.ts` for the full
 * reasoning. This is a deliberate, authorized decision, not an error.
 *
 * Workbook Program Registry names this Asset "Financial Model" verbatim, as
 * one of P023 — Model's Primary Assets. No one-line description exists for
 * it beyond the name itself. Owned by P023; not shared with another Program.
 */
export const AS049_FINANCIAL_MODEL: AssetDef = {
  id: 'AS049',
  name: 'Financial Model',
  program: 'P023',
  outputSchema: 'markdown',
  instructionsRef: 'AS049',
}
