import type { AssetDef } from '../../../types'

/**
 * AS014 — Proposal & ROI Toolkit.
 *
 * Workbook (Program Registry, P004 assets): the company's authoritative
 * commercial toolkit — proposal structure, executive business case, ROI
 * calculator methodology, TCO model and cost-benefit analysis. Originally
 * owned by P004 — Sales Enablement, which was merged into P005 Customer
 * Acquisition (Phase 10 Part 3, program consolidation).
 */
export const AS014_PROPOSAL_ROI_TOOLKIT: AssetDef = {
  id: 'AS014',
  name: 'Proposal & ROI Toolkit',
  program: 'P005',
  outputSchema: 'markdown',
  instructionsRef: 'AS014',
}
