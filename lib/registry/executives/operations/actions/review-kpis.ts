import type { ActionDef } from '../../../types'

/**
 * review_kpis — assess the company's operational, financial and strategic
 * KPIs against target, per the KPI Dashboard (AS020), and report what moved,
 * what stalled and why.
 *
 * Internal analysis, not a live metrics write — no analytics-write Connector
 * is registered (posthog is read/sync only; see `lib/registry/types.ts`'s
 * `ConnectorId` comment). This Action produces a findings report for the
 * founder. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const REVIEW_KPIS: ActionDef = {
  id: 'review_kpis',
  program: 'P009',
  name: 'Review KPIs',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_kpis',
}
