import type { AssetDef } from '../../types'

/**
 * AS002 — Pains & Gains Matrix.
 *
 * Workbook (Asset Registry): "Maps customer problems, desired outcomes and
 * buying triggers."
 *
 * Naming note: the Asset Prompts sheet calls this "Pain & Gain Matrix" while the
 * Asset Registry says "Pains & Gains Matrix". The Registry is the catalogue, so
 * its spelling wins.
 */
export const AS002_PAINS_GAINS_MATRIX: AssetDef = {
  id: 'AS002',
  name: 'Pains & Gains Matrix',
  program: 'P001',
  outputSchema: 'markdown',
  instructionsRef: 'AS002',
}
