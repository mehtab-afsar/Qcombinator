import type { ActionDef } from '../../../types'

/**
 * publish_content — produce the next scheduled piece of content against the
 * Content Strategy's editorial calendar and pillars.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here because the workbook doesn't resolve it:
 * this produces a DRAFT ready for the founder (or whoever runs the CMS/blog)
 * to publish — it does not publish anything itself. `irreversible: false`, no
 * `connector`. No CMS/blog Connector exists yet (only gmail, slack, stripe,
 * posthog are registered — lib/connectors/registry.ts), and "publish" in the
 * Action name describes the workbook's deliverable, not a live external send.
 * If a real CMS Connector is added later, this Action's `irreversible` and
 * `connector` fields are exactly what would change — not its prompt.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const PUBLISH_CONTENT: ActionDef = {
  id: 'publish_content',
  name: 'Publish Content',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'publish_content',
}
