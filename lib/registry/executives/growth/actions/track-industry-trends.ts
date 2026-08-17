import type { ActionDef } from '../../../types'

/**
 * track_industry_trends — identify technology, regulatory, funding,
 * macroeconomic and competitive-move developments relevant to the company,
 * distinguishing short-term trends from structural shifts, for the Market
 * Trends section of the Market Intelligence Report (AS018).
 *
 * Internal analysis, not a live news feed — there is no news/monitoring
 * Connector registered (only gmail, slack, gmail_read, stripe and posthog
 * exist), so this Action works from Company Context and whatever market
 * evidence the founder has already captured. `irreversible: false`, no
 * `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const TRACK_INDUSTRY_TRENDS: ActionDef = {
  id: 'track_industry_trends',
  name: 'Track Industry Trends',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'track_industry_trends',
}
