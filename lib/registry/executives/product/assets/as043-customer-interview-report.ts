import type { AssetDef } from '../../../types'

/**
 * AS043 — Customer Interview Report.
 *
 * ⚠️ NEWLY MINTED ID — not read off the workbook's Asset Registry sheet.
 * Every Asset id seeded before this one came directly from that sheet; this
 * one, and AS044–AS048 alongside it, did not — the sheet never assigned P015
 * a single real id. The founder was asked directly and explicitly chose to
 * assign new ids now, sequentially from AS043 (the workbook's own last
 * assignment was AS042). See
 * `lib/registry/executives/product/programs/p015-validate.ts` for the full
 * reasoning. This is a deliberate, authorized decision, not an error.
 *
 * Workbook Program Registry names this Asset "Customer Interview Report"
 * verbatim, as one of P015 — Validate's Primary Assets. No one-line
 * description exists for it beyond the name itself. Owned by P015; not
 * shared with another Program.
 */
export const AS043_CUSTOMER_INTERVIEW_REPORT: AssetDef = {
  id: 'AS043',
  name: 'Customer Interview Report',
  program: 'P015',
  outputSchema: 'markdown',
  instructionsRef: 'AS043',
}
