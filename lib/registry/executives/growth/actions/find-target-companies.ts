import type { ActionDef } from '../../../types'

/**
 * find_target_companies — identify companies matching the ICP already
 * defined in AS001 (P001 GTM's ICP Profiles) and this Program's own AS015
 * Customer Acquisition Blueprint, and produce a shortlist with rationale.
 *
 * Internal research output, not a live data pull — there is no
 * prospecting/data-enrichment Connector registered (only gmail, slack,
 * stripe, posthog are — lib/connectors/registry.ts). `irreversible: false`,
 * no `connector`.
 *
 * Does NOT redefine the ICP here. AS001 is the authoritative source for who
 * the company should sell to. This Action reads/references it; it never
 * recreates the framework.
 *
 * First of P005's new four-step targeting sequence (this Action, then
 * find_decision_makers, research_account, score_and_prioritize_leads),
 * which replaces the single former generate_lead_lists Action — see
 * p005-acquire.ts for the full restructuring rationale.
 */
export const FIND_TARGET_COMPANIES: ActionDef = {
  id: 'find_target_companies',
  program: 'P005',
  name: 'Find Target Companies',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'find_target_companies',
}
