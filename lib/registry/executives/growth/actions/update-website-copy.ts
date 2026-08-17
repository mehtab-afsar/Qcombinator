import type { ActionDef } from '../../../types'

/**
 * update_website_copy — draft refreshed website copy aligned to the current
 * Positioning & Messaging Framework and Brand Guidelines.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here because the workbook doesn't resolve it:
 * this produces a DRAFT for the founder to use or hand to whoever publishes
 * the site — it does not publish anything itself. `irreversible: false`, no
 * `connector`. Two reasons:
 *   1. No website/CMS Connector exists yet (only gmail, slack, stripe,
 *      posthog are registered — lib/connectors/registry.ts) — actually
 *      publishing would need a new adapter, which is out of scope here.
 *   2. It matches the Program Prompt's own philosophy verbatim: "Assume
 *      autonomous execution. Only request Founder approval when the
 *      company's strategic positioning changes materially" — a drafted copy
 *      update is exactly the kind of internal work ADR-002/ADR-004 keep
 *      approval-free; only an external send/publish would require it.
 *
 * If a real website Connector is added later, this Action's `irreversible`
 * and `connector` fields are exactly what would change — not its prompt.
 */
export const UPDATE_WEBSITE_COPY: ActionDef = {
  id: 'update_website_copy',
  program: 'P002',
  name: 'Update Website Copy',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'update_website_copy',
}
