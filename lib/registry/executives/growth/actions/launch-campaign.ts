import type { ActionDef } from '../../../types'

/**
 * launch_campaign — turn the Campaign Strategy into a ready-to-run campaign
 * plan for a specific channel and objective.
 *
 * ⚠️ A JUDGEMENT CALL, recorded here because the workbook doesn't resolve it:
 * despite the name, this produces a launch-ready PLAN (audience, creative,
 * budget, KPI) for the founder to actually run — it does not spend money or
 * push anything live itself. `irreversible: false`, no `connector`. No paid
 * media/ads Connector exists yet (only gmail, slack, stripe, posthog are
 * registered — lib/connectors/registry.ts), so there is nothing for this
 * Action to reach externally through. If a real ads Connector is added later,
 * this Action's `irreversible` and `connector` fields are exactly what would
 * change — not its prompt.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name and one-line purpose came from the Program Registry.
 */
export const LAUNCH_CAMPAIGN: ActionDef = {
  id: 'launch_campaign',
  name: 'Launch Campaign',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'launch_campaign',
}
