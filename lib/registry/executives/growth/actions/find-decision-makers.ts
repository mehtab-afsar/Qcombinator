import type { ActionDef } from '../../../types'

/**
 * find_decision_makers — for a set of target companies, identify likely
 * decision-maker ROLES/TITLES to reach (e.g. "VP of Engineering", "Head of
 * Product") — never real people or scraped emails.
 *
 * Internal research output, not a live data pull — there is no
 * people-search/contact-enrichment Connector registered (only gmail, slack,
 * stripe, posthog are — lib/connectors/registry.ts). `irreversible: false`,
 * no `connector`. This is a deliberate boundary, not an oversight: naming a
 * role is safe; inventing a person or an email address is exactly the
 * fabrication interview_customers.ts's recipient rule exists to prevent.
 *
 * Second of P005's new targeting sequence — see find-target-companies.ts.
 *
 * AI SDR Milestone 1 (real chaining): `dependsOn: 'find_target_companies'` — this Action's
 * prompt is enriched with that Action's own result (the target-company shortlist), threaded in
 * as CompanyContext.dependencyResult by lib/rhythm/run.ts, not re-derived from scratch.
 */
export const FIND_DECISION_MAKERS: ActionDef = {
  id: 'find_decision_makers',
  program: 'P005',
  name: 'Find Decision Makers',
  kind: 'oneoff',
  dependsOn: 'find_target_companies',
  irreversible: false,
  instructionsRef: 'find_decision_makers',
}
