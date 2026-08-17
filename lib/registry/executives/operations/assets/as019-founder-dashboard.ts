import type { AssetDef } from '../../../types'

/**
 * AS019 — Founder Dashboard.
 *
 * Workbook Asset Registry, verbatim description: "Executive dashboard
 * summarising company performance, KPIs, Q-Score, financials and strategic
 * progress." Owned by P009 — Review. Not shared with another Program.
 *
 * See `lib/registry/executives/operations/programs/p009-review.ts` for why
 * P009 seeds only three Assets (AS019–AS021) when both the workbook's Program
 * Registry prose and S005's own "Program Portfolio" section name five.
 */
export const AS019_FOUNDER_DASHBOARD: AssetDef = {
  id: 'AS019',
  name: 'Founder Dashboard',
  program: 'P009',
  outputSchema: 'markdown',
  instructionsRef: 'AS019',
}
