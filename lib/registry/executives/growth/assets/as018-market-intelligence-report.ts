import type { AssetDef } from '../../../types'

/**
 * AS018 — Market Intelligence Report.
 *
 * Workbook (Program Registry, P008 assets): the company's authoritative
 * ongoing analysis of competitors, customers and market developments —
 * Porter's Five Forces, competitor landscape, customer insights, market
 * trends, SWOT, win/loss analysis and prioritised recommendations. Owned by
 * P008 — Market Intelligence. Not shared with another Program.
 */
export const AS018_MARKET_INTELLIGENCE_REPORT: AssetDef = {
  id: 'AS018',
  name: 'Market Intelligence Report',
  program: 'P008',
  outputSchema: 'markdown',
  instructionsRef: 'AS018',
}
