import type { ActionDef } from '../../../types'

/**
 * define_product_vision — articulate or refresh the company's long-term Product Vision from
 * Company Context (strategy, Q-Score signal, market), plus the evidence P015 has already
 * validated (PMF Scorecard, Problem Validation Report) where it exists.
 *
 * Internal analysis, not a live document push — no CMS/roadmap-tool Connector is registered
 * (only gmail, slack, stripe, posthog are), and this Action's deliverable is the Product Vision
 * a human still edits/socialises. `irreversible: false`, no `connector`.
 *
 * First link in P016's chain — see plan-product-roadmap.ts for the next one.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name and
 * one-line purpose came from the Program Registry (see p016-product.ts).
 */
export const DEFINE_PRODUCT_VISION: ActionDef = {
  id: 'define_product_vision',
  program: 'P016',
  name: 'Define Product Vision',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'define_product_vision',
}
