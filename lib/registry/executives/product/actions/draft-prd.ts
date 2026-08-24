import type { ActionDef } from '../../../types'

/**
 * draft_prd — write a Product Requirements Document for whatever this cycle's backlog ranking
 * just put first, not whichever item happens to be top of mind.
 *
 * Internal draft, not a live spec-tool push — no CMS/roadmap-tool Connector is registered (only
 * gmail, slack, stripe, posthog are), and this Action's deliverable is a PRD a human still
 * reviews and hands to engineering. `irreversible: false`, no `connector`.
 *
 * `dependsOn: 'prioritize_backlog'` — the fourth and final link in P016's chain: reads that
 * Action's own result as real input, so the PRD is written for the item the ranking actually
 * chose, not guessed independently of it.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name and
 * one-line purpose came from the Program Registry (see p016-product.ts).
 */
export const DRAFT_PRD: ActionDef = {
  id: 'draft_prd',
  program: 'P016',
  name: 'Draft PRD',
  kind: 'oneoff',
  dependsOn: 'prioritize_backlog',
  irreversible: false,
  instructionsRef: 'draft_prd',
}
