import type { AssetDef } from '../../../types'

/**
 * AS057 — Product Success Metrics.
 *
 * ⚠️ NEWLY MINTED ID — see AS054's header (same directory) for the full reasoning.
 *
 * Workbook Program Registry names this Asset "Success Metrics" verbatim, as one of P016 —
 * Product's Primary Assets. Named "Product Success Metrics" here, not the bare workbook name —
 * "Success Metrics" alone would be confusable with `ProgramTemplate.successMetric`, an unrelated
 * single-line internal judgment field every Program already has (PRD §14, moves no Q-Score,
 * gates no execution). This Asset is a real, versioned document tracking the company's actual
 * product metrics over time; the Program's `successMetric` is not. Owned by P016; not shared
 * with another Program.
 */
export const AS057_PRODUCT_SUCCESS_METRICS: AssetDef = {
  id: 'AS057',
  name: 'Product Success Metrics',
  program: 'P016',
  outputSchema: 'markdown',
  instructionsRef: 'AS057',
}
