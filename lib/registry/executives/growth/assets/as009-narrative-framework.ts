import type { AssetDef } from '../../../types'

/**
 * AS009 — Narrative Framework.
 *
 * Workbook (Asset Registry): "Defines the company's story for customers,
 * partners and investors." Owned by P002 — Brand Strategy.
 */
export const AS009_NARRATIVE_FRAMEWORK: AssetDef = {
  id: 'AS009',
  name: 'Narrative Framework',
  program: 'P002',
  outputSchema: 'markdown',
  instructionsRef: 'AS009',
}
