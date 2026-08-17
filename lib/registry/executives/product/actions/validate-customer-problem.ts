import type { ActionDef } from '../../../types'

/**
 * validate_customer_problem — assess whether a candidate customer problem is
 * real, evidenced and worth building for, producing the Problem Validation
 * Report (AS045).
 *
 * Internal and reversible: an analysis, not a live external effect. No
 * interview-tooling or research Connector is registered today (only gmail,
 * slack, gmail_read, stripe and posthog are — see `lib/registry/types.ts`'s
 * `ConnectorId` comment), so this produces a validation report rather than
 * actually running a live study.
 *
 * AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows past
 * P014 carry an Actions column at all; only the name came from this Program's
 * own authored Action list (see p015-validate.ts).
 */
export const VALIDATE_CUSTOMER_PROBLEM: ActionDef = {
  id: 'validate_customer_problem',
  name: 'Validate Customer Problem',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'validate_customer_problem',
}
