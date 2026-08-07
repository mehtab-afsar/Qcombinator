import type { ActionDef } from '../../../types'

/**
 * post_team_update — post an approved GTM update to Slack, as the Edge Alpha bot.
 *
 * ─── THE SECOND CONNECTOR PROOF CASE ─────────────────────────────────────────
 * `interview_customers` proved the Connector boundary once, for Gmail. This is the second
 * proof — for Slack, and for MCP as the transport behind `send()` (docs/F13_F14_DESIGN.md §11).
 * Same shape: payload prepared → founder approves → Slack posts → logged. Nothing external
 * happens without that approval (ADR-004).
 *
 * ⚠️ `irreversible: true` is a SAFETY PROPERTY, not a label — same warning as
 * `interview_customers`. A message posted to a real Slack channel is visible and effectively
 * permanent; flip this to false and it posts with nobody watching.
 *
 * AUTHORED, NOT SEEDED — this Action postdates the design workbook entirely (it exists to pilot
 * MCP-as-connector-transport, not something the workbook's Action Registry could have named).
 * This file is the runtime source regardless (ADR-010).
 */
export const POST_TEAM_UPDATE: ActionDef = {
  id: 'post_team_update',
  name: 'Post Team Update',
  kind: 'oneoff',
  irreversible: true,
  connector: 'slack',
  instructionsRef: 'post_team_update',
}
