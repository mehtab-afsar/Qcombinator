import type { ActionDef } from '../../../types'

/**
 * prioritize_backlog — groom and rank Product Backlog items against what this cycle's Roadmap
 * just said matters, not against a generic scoring rubric applied cold.
 *
 * Internal analysis, not a live backlog-tool write — no CMS/roadmap-tool Connector is registered
 * (only gmail, slack, stripe, posthog are), and this Action's deliverable is a ranked list a
 * human still applies in the team's actual tracker. `irreversible: false`, no `connector`.
 *
 * `dependsOn: 'plan_product_roadmap'` — the third link in P016's chain: reads that Action's own
 * result as real input, so ranking reflects this cycle's actual roadmap sequencing.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name and
 * one-line purpose came from the Program Registry (see p016-product.ts).
 */
export const PRIORITIZE_BACKLOG: ActionDef = {
  id: 'prioritize_backlog',
  program: 'P016',
  name: 'Prioritize Backlog',
  kind: 'oneoff',
  dependsOn: 'plan_product_roadmap',
  irreversible: false,
  instructionsRef: 'prioritize_backlog',
}
