import type { ActionDef } from '../../../types'

/**
 * prioritize_features — rank candidate features against validated customer
 * problems and produce the Feature Prioritisation Matrix (AS047).
 *
 * Internal and reversible: a ranking, not a live change to a roadmap or
 * backlog tool. No project-management Connector is registered today (only
 * gmail, slack, gmail_read, stripe and posthog are — see
 * `lib/registry/types.ts`'s `ConnectorId` comment), so this produces a
 * ranked matrix rather than actually writing to a live backlog.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from this Program's
 * own authored Action list (see p015-validate.ts).
 */
export const PRIORITIZE_FEATURES: ActionDef = {
  id: 'prioritize_features',
  name: 'Prioritize Features',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'prioritize_features',
}
