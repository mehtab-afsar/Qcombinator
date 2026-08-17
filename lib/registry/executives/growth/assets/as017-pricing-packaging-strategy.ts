import type { AssetDef } from '../../../types'

/**
 * AS017 — Pricing & Packaging Strategy.
 *
 * Workbook (Program Registry, P007 assets): the company's authoritative
 * commercial pricing, packaging and revenue architecture — value-based
 * pricing, Good-Better-Best packaging, price sensitivity, discount policy
 * and unit economics. Originally owned by P007 — Pricing & Packaging, which
 * was merged into P001 GTM & Strategy (Phase 10 Part 3, program
 * consolidation). Not shared with another Program.
 */
export const AS017_PRICING_PACKAGING_STRATEGY: AssetDef = {
  id: 'AS017',
  name: 'Pricing & Packaging Strategy',
  program: 'P001',
  outputSchema: 'markdown',
  instructionsRef: 'AS017',
}
