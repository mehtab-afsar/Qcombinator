import type { AssetDef } from '../../../types'

/**
 * AS017 — Pricing & Packaging Strategy.
 *
 * Workbook (Program Registry, P007 assets): the company's authoritative
 * commercial pricing, packaging and revenue architecture — value-based
 * pricing, Good-Better-Best packaging, price sensitivity, discount policy
 * and unit economics. Owned by P007 — Pricing & Packaging. Not shared with
 * another Program.
 */
export const AS017_PRICING_PACKAGING_STRATEGY: AssetDef = {
  id: 'AS017',
  name: 'Pricing & Packaging Strategy',
  program: 'P007',
  outputSchema: 'markdown',
  instructionsRef: 'AS017',
}
