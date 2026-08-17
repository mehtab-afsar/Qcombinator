import type { ActionDef } from '../../../types'

/**
 * score_and_prioritize_leads — rank the accounts identified so far by
 * evidenced/inferred/assumed fit, same evidence discipline as P001's
 * prioritize_channels, producing a ranked shortlist plus which to
 * deprioritize and why.
 *
 * Internal analysis, not a live CRM write — there is no CRM Connector
 * registered (only gmail, slack, stripe, posthog are). `irreversible:
 * false`, no `connector`.
 *
 * Distinct from qualify_leads: this ranks CANDIDATE accounts/leads before
 * outreach happens (which to pursue first); qualify_leads scores a batch
 * AFTER contact, against AS015's Lead Scoring Framework, to decide sales
 * readiness. Fourth and last of P005's new targeting sequence — see
 * find-target-companies.ts.
 *
 * AI SDR Milestone 1 (real chaining): `dependsOn: 'research_account'` — reads that Action's own
 * result (the account brief) as an input, threaded in by lib/rhythm/run.ts.
 */
export const SCORE_AND_PRIORITIZE_LEADS: ActionDef = {
  id: 'score_and_prioritize_leads',
  program: 'P005',
  name: 'Score & Prioritize Leads',
  kind: 'oneoff',
  dependsOn: 'research_account',
  irreversible: false,
  instructionsRef: 'score_and_prioritize_leads',
}
