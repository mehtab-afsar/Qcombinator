import type { ActionDef } from '../../../types'

/**
 * score_product_market_fit — assess the company's current product-market fit
 * and produce the PMF Scorecard (AS044).
 *
 * Internal and reversible: an assessment, not a live change to anything
 * external. No survey-tooling or analytics-write Connector is registered
 * today (only gmail, slack, gmail_read, stripe and posthog are — see
 * `lib/registry/types.ts`'s `ConnectorId` comment), so this produces a scored
 * analysis rather than actually running a live PMF survey.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from this Program's
 * own authored Action list (see p015-validate.ts).
 */
export const SCORE_PRODUCT_MARKET_FIT: ActionDef = {
  id: 'score_product_market_fit',
  program: 'P015',
  name: 'Score Product-Market Fit',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'score_product_market_fit',
}
