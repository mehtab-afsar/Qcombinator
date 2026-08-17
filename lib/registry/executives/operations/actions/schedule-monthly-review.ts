import type { ActionDef } from '../../../types'

/**
 * schedule_monthly_review — set the cadence and agenda for the company's
 * Monthly Business Review (which KPIs, which Assets, which stakeholders),
 * per the Founder Dashboard (AS019) and KPI Dashboard (AS020).
 *
 * Internal scheduling artefact, not a live calendar write — no calendar
 * Connector is registered (only gmail, slack, gmail_read, stripe and posthog
 * are; see `lib/registry/types.ts`'s `ConnectorId` comment). This Action
 * produces a schedule and agenda the founder still books manually.
 * `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const SCHEDULE_MONTHLY_REVIEW: ActionDef = {
  id: 'schedule_monthly_review',
  program: 'P009',
  name: 'Schedule Monthly Review',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'schedule_monthly_review',
}
