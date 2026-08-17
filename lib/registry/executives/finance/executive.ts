import type { Executive } from '../../types'

/**
 * Finance (CFO).
 *
 * Workbook Executive Registry: `A006 | Chief Financial Officer, CFO | Finance |
 * S006`. PRD §7.1 roster: owns P023–P029, folds in `felix` and `leo`.
 *
 * `programs: ['P023']` — P023 (Model) is now seeded, the first of Finance's
 * seven Programs to get real ids and content, the same way P015 was Product's
 * first. P024–P029 remain asset-names-only in the workbook, with no ids and
 * no actions — not seedable without inventing data, exactly as P016–P022
 * remain for Product.
 *
 * ⚠️ NAME — S006's own voice prompt (`lib/prompts/executives/finance/voice.ts`)
 * repeatedly and deliberately says "You are Morgan, the Chief Financial
 * Officer" — real, workbook-sourced content, not invented here. `name` below
 * follows the same personal-name-plus-role pattern already used by
 * `GROWTH.name` ('Patel (Chief Growth Officer)'). This "Morgan" is unrelated
 * to any other persona of the same name elsewhere in this codebase.
 */
export const FINANCE: Executive = {
  id: 'finance',
  name: 'Morgan (Chief Financial Officer)',
  motto: 'I keep the company alive and fundable.',
  domains: ['Finance'],
  programs: ['P023'],
  systemPromptRef: 'S006',
  inheritsFrom: ['felix', 'leo'],
}
