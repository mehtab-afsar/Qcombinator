import type { ActionDef } from '../../../types'

/**
 * monitor_health_scores — score and tier a batch of customers against the
 * Customer Success Framework's Customer Health Score Framework (product
 * usage, engagement, business outcomes, support activity, executive
 * engagement, commercial relationship, satisfaction, renewal likelihood).
 *
 * Internal analysis, not a live dashboard write — there is no product
 * analytics/CRM write-back Connector registered for customer health data
 * (only gmail, slack, stripe, posthog are — lib/connectors/registry.ts), and
 * this Action's deliverable is a scored assessment a human still has to act
 * on or apply to a dashboard. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const MONITOR_HEALTH_SCORES: ActionDef = {
  id: 'monitor_health_scores',
  name: 'Monitor Health Scores',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_health_scores',
}
