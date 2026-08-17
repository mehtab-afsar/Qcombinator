import type { ActionDef } from '../../../types'

/**
 * research_account — synthesise what is knowable about ONE target account
 * from Company Context (public info, prior interactions) into a brief a
 * founder or generate_personalized_outreach can use.
 *
 * Internal synthesis, not a live research pull — there is no web-research
 * Connector registered (only gmail, slack, stripe, posthog are —
 * lib/connectors/registry.ts). `irreversible: false`, no `connector`.
 *
 * Third of P005's new targeting sequence — see find-target-companies.ts.
 *
 * AI SDR Milestone 1 (real chaining): `dependsOn: 'find_decision_makers'` — reads that Action's
 * own result (which roles/titles to reach) as an input, threaded in by lib/rhythm/run.ts.
 */
export const RESEARCH_ACCOUNT: ActionDef = {
  id: 'research_account',
  program: 'P005',
  name: 'Research Account',
  kind: 'oneoff',
  dependsOn: 'find_decision_makers',
  irreversible: false,
  instructionsRef: 'research_account',
}
