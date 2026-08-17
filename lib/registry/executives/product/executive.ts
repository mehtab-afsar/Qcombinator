import type { Executive } from '../../types'

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
 * That is the Composer's headline acceptance test. It is an ownership check
 * (`P001.owner !== 'product'`), not a text check — it never needed S004's prompt
 * text to exist, only this executive record. S004's real text is now seeded too
 * (`lib/prompts/executives/product/voice.ts`), and the invalid-pairing test still
 * fails for the same ownership reason as before, unchanged.
 *
 * `programs: ['P015']` — P015 — Validate is the first Product Program seeded for
 * real. Its six Assets (AS043–AS048) are newly minted ids, not read off the
 * workbook's Asset Registry sheet: that sheet only ever assigned ids through
 * AS042, so it never assigned any to Product's named assets. The founder was
 * asked directly and explicitly chose to mint AS043–AS048 now rather than leave
 * P015 asset-less — see
 * `lib/registry/executives/product/programs/p015-validate.ts` for the full
 * reasoning. P016–P022 remain unseeded — the workbook names their assets in
 * prose only, with no ids at all, and no founder decision has extended the
 * minted range past AS048.
 */
export const PRODUCT: Executive = {
  id: 'product',
  name: 'Chief Technology Officer',
  motto: 'I build what the market will pay for.',
  domains: ['Product & Technology'],
  programs: ['P015'],
  systemPromptRef: 'S004',
  inheritsFrom: ['nova'],
}
