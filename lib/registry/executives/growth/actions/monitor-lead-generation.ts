import type { ActionDef } from '../../../types'

/**
 * monitor_lead_generation — review lead volume, source mix and conversion
 * against the Campaign Strategy's KPIs and report where the demand engine is
 * under- or over-performing.
 *
 * Internal analysis. Reads Company Context and AS012's success metrics,
 * touches nothing outside the product on its own, so it runs autonomously — approval
 * gates exist ONLY at the Connector boundary, never on internal work
 * (ADR-002, ADR-004). If the founder has clicked "Pull from PostHog" (see
 * `founder_pulled_data` / `app/api/actions/[actionId]/pull-data/route.ts`), real trend data
 * reaches Company Context as "Real Data You Pulled In" — cached from the founder's last click,
 * never fetched by this Action on its own initiative.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const MONITOR_LEAD_GENERATION: ActionDef = {
  id: 'monitor_lead_generation',
  program: 'P003',
  name: 'Monitor Lead Generation',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'monitor_lead_generation',
}
