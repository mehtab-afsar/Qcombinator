import type { ActionDef } from '../../../types'

/**
 * plan_product_roadmap — sequence the company's Product Roadmap from the Product Vision this
 * cycle just defined, not a stale one from a prior cycle.
 *
 * Internal analysis, not a live tool push — same reasoning as define-product-vision.ts.
 * `irreversible: false`, no `connector`.
 *
 * `dependsOn: 'define_product_vision'` — the second link in P016's chain (AI SDR Milestone 1's
 * mechanism, `lib/rhythm/run.ts`'s `dependencyContextFor`, applied to Product for the first
 * time): reads that Action's own result as real input, instead of re-deriving a vision reading
 * from scratch.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name and
 * one-line purpose came from the Program Registry (see p016-product.ts).
 */
export const PLAN_PRODUCT_ROADMAP: ActionDef = {
  id: 'plan_product_roadmap',
  program: 'P016',
  name: 'Plan Product Roadmap',
  kind: 'oneoff',
  dependsOn: 'define_product_vision',
  irreversible: false,
  instructionsRef: 'plan_product_roadmap',
}
