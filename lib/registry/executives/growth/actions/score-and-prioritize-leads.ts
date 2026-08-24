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
 *
 * ⚠️ `produces: 'lead'` — THE FIRST ACTION IN THE SYSTEM THAT WRITES A REAL RECORD
 * (docs/AGI_ACTIONS_PRD.md, spine slice 1). Chosen for this deliberately: it is the LAST step of
 * P005's research chain, it already receives the whole upstream chain (find_target_companies →
 * find_decision_makers → research_account) via dependsOn, and it is the natural "here is the
 * final ranked list" moment. One writer at the end of the chain means no upsert ambiguity
 * between four Actions racing to create the same row. Its prompt emits the matching fenced JSON;
 * lib/entities/leads.ts validates and writes it.
 *
 * Still `irreversible: false` — writing an internal, founder-owned row is not a Connector side
 * effect. Nothing leaves the building, so ADR-004's boundary does not apply.
 */
export const SCORE_AND_PRIORITIZE_LEADS: ActionDef = {
  id: 'score_and_prioritize_leads',
  program: 'P005',
  name: 'Score & Prioritize Leads',
  kind: 'oneoff',
  dependsOn: 'research_account',
  irreversible: false,
  produces: 'lead',
  instructionsRef: 'score_and_prioritize_leads',
}
