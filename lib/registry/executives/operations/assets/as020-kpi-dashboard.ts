import type { AssetDef } from '../../../types'

/**
 * AS020 — KPI Dashboard.
 *
 * Workbook Asset Registry, verbatim description: "Defines the company's
 * operational, financial and strategic KPIs with targets and trends." Owned
 * by P009 — Review. Not shared with another Program.
 *
 * See `lib/registry/executives/operations/programs/p009-review.ts` for why
 * P009 seeds only three Assets (AS019–AS021) when both the workbook's Program
 * Registry prose and S005's own "Program Portfolio" section name five.
 */
export const AS020_KPI_DASHBOARD: AssetDef = {
  id: 'AS020',
  name: 'KPI Dashboard',
  program: 'P009',
  outputSchema: 'markdown',
  instructionsRef: 'AS020',
}
