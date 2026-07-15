import type { AssetDef } from '../../types'

/**
 * AS001 — ICP Profiles.
 *
 * Workbook (Asset Registry): "Defines priority customer segments, buyers and
 * decision-makers."
 *
 * `outputSchema: 'markdown'` is sourced, not assumed — the workbook's Standard
 * Asset Prompt fixes it for every Asset: "Output Standards — Unless specified
 * otherwise: Use Markdown." AS001's own prompt asks for an 8–12 page report with
 * tables, cards and matrices.
 */
export const AS001_ICP_PROFILES: AssetDef = {
  id: 'AS001',
  name: 'ICP Profiles',
  program: 'P001',
  outputSchema: 'markdown',
  instructionsRef: 'AS001',
}
