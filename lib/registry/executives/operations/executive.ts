import type { Executive } from '../../types'

/**
 * Operations (COO).
 *
 * Workbook Executive Registry: `A005 | Chief Operations Officer, COO |
 * Operations | S005`. PRD §7.1 roster: owns P009–P014, folds in `harper`.
 *
 * `programs: ['P009']` — the FIRST Program ever seeded for an executive other
 * than Growth. P009's own voice prompt (S005,
 * `lib/prompts/executives/operations/voice.ts`) is seeded too, for the first
 * time.
 *
 * The contradiction this comment used to flag is now resolved, not just
 * documented: the workbook's Program Registry prose lists P009's assets as
 * "Founder Dashboard, Monthly Review Report, KPI Dashboard, Q-Score Trend,
 * Executive Summary" (five), but the Asset Registry sheet — the one that
 * assigns real, stable AS0NN ids — only ever assigned ids to three of them
 * (AS019, AS020, AS021). Rather than seed on top of that contradiction, P009
 * seeds exactly the three Assets that actually have ids. See
 * `lib/registry/executives/operations/programs/p009-review.ts` for the full
 * reasoning.
 *
 * P010–P014 remain unseeded — same situation P002–P008 were once in for
 * Growth. Add them the same way, one Program at a time, when their own
 * workbook content is resolved.
 */
export const OPERATIONS: Executive = {
  id: 'operations',
  name: 'Chief Operations Officer',
  motto: 'I make the company run.',
  domains: ['Operations'],
  programs: ['P009'],
  systemPromptRef: 'S005',
  inheritsFrom: ['harper'],
}
