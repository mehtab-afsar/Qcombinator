import type { ActionDef } from '../../../types'

/**
 * monitor_competitors — scan available evidence on named and emerging
 * competitors (positioning, product, pricing, moves) and report what has
 * changed since the last review, feeding the Competitor Landscape section
 * of the Market Intelligence Report (AS018).
 *
 * Internal analysis, not a live monitoring feed — there is no competitive-
 * intelligence or web-monitoring Connector registered (only gmail, slack,
 * gmail_read, stripe and posthog exist; see `lib/registry/types.ts`'s
 * `ConnectorId`), so this Action works from Company Context and whatever
 * competitor evidence the founder has already captured, not from a live
 * crawl. `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const MONITOR_COMPETITORS: ActionDef = {
  id: 'monitor_competitors',
  name: 'Monitor Competitors',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_competitors',
}
