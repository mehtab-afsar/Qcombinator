import type { Executive } from '../types'

/**
 * Product (CTO).
 *
 * Workbook Executive Registry: `A004 | Chief Technology Officer, CTO | Product &
 * Technology | S004`. PRD §7.1 roster: owns P015–P022, folds in `nova`.
 *
 * ⚠️ **S004 is load-bearing for F06.** PRD §7.2's worked example of an invalid
 * execution package is: "executing P001 with the CTO system prompt S004 is
 * invalid — the Registry defines P001 under the Growth executive (S003)."
 *
 * That is the Composer's headline acceptance test, and it cannot be written
 * unless S004 exists in the Registry to be wrongly paired with P001. Seeding this
 * executive now is what makes that test possible.
 *
 * `programs: []` — P015–P022 have no asset ids and no actions in the workbook, so
 * they are not seedable without inventing data (see PHASE0_AUDIT / the F05 plan).
 */
export const PRODUCT: Executive = {
  id: 'product',
  name: 'Chief Technology Officer',
  motto: 'I build what the market will pay for.',
  domains: ['Product & Technology'],
  programs: [],
  systemPromptRef: 'S004',
  inheritsFrom: ['nova'],
}
