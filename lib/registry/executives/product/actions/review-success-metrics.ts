import type { ActionDef } from '../../../types'

/**
 * review_success_metrics — check real traction against the company's Product Success Metrics,
 * and report plainly whether the roadmap this cycle produced is actually working.
 *
 * Internal analysis, not a live analytics pull — no analytics/BI Connector is registered for
 * this purpose, and this Action's deliverable is a written read a human still acts on.
 * `irreversible: false`, no `connector`.
 *
 * ⚠️ DELIBERATELY NO `dependsOn` — do not add one. This reads broadly from Company Context and
 * real traction data (Q-Score, prior cycles), not from one specific prior step in this cycle's
 * chain — the same reasoning `monitor_and_classify_responses` (P005) stays independent (see that
 * file's own header). Whether the roadmap is working is a question about outcomes over time, not
 * about what any single upstream Action in this same run just produced.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name and
 * one-line purpose came from the Program Registry (see p016-product.ts).
 */
export const REVIEW_SUCCESS_METRICS: ActionDef = {
  id: 'review_success_metrics',
  program: 'P016',
  name: 'Review Success Metrics',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_success_metrics',
}
