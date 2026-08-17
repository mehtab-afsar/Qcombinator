import type { AssetDef } from '../../../types'

/**
 * AS021 — Q-Score Trend Report.
 *
 * Workbook Asset Registry, verbatim description: "Tracks historical Q-Score
 * development, changes and key drivers over time." Owned by P009 — Review.
 * Not shared with another Program.
 *
 * ADR-005 still holds here: this Asset reports on the Q-Score, it never
 * writes to it. Nothing in P009 or AS021 calls the score signal writer.
 *
 * See `lib/registry/executives/operations/programs/p009-review.ts` for why
 * P009 seeds only three Assets (AS019–AS021) when both the workbook's Program
 * Registry prose and S005's own "Program Portfolio" section name five.
 */
export const AS021_QSCORE_TREND_REPORT: AssetDef = {
  id: 'AS021',
  name: 'Q-Score Trend Report',
  program: 'P009',
  outputSchema: 'markdown',
  instructionsRef: 'AS021',
}
