import type { ActionDef } from '../../../types'

/**
 * review_unit_economics — assess the Unit Economics Model (AS053) — CAC,
 * LTV, payback, contribution margin — for what it implies about the
 * company's capital efficiency this cycle.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from P023's own
 * authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 *
 * Internal and reversible: produces an analysis, no external side effect.
 * No billing/analytics-write Connector is wired for this — the registered
 * Stripe connector is read/sync only, the same reasoning P007's
 * pricing-adjacent actions already settled for the Growth executive. Runs
 * autonomously (ADR-004).
 */
export const REVIEW_UNIT_ECONOMICS: ActionDef = {
  id: 'review_unit_economics',
  program: 'P023',
  name: 'Review Unit Economics',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'review_unit_economics',
}
