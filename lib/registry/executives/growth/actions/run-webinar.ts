import type { ActionDef } from '../../../types'

/**
 * run_webinar — produce a webinar plan (topic, audience, format, promotion,
 * follow-up) drawn from the Content and Campaign Strategies.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here because the workbook doesn't resolve it:
 * despite the name, this produces a PLAN for the founder to actually schedule
 * and run — it does not host, broadcast or send an invite to anyone itself.
 * `irreversible: false`, no `connector`. No webinar/events Connector exists
 * yet (only gmail, slack, stripe, posthog are registered —
 * lib/connectors/registry.ts). If a real webinar Connector is added later,
 * this Action's `irreversible` and `connector` fields are exactly what would
 * change — not its prompt.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const RUN_WEBINAR: ActionDef = {
  id: 'run_webinar',
  program: 'P003',
  name: 'Run Webinar',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'run_webinar',
}
