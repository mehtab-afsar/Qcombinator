import type { ActionDef } from '../../../types'

/**
 * generate_personalized_outreach — draft AND send first-touch outreach to
 * prioritized leads via Gmail. Replaces launch_outreach.
 *
 * ⚠️ THE SECOND REAL-SEND ACTION IN THE WHOLE SYSTEM, alongside P001's
 * interview_customers. Same proof case, same shape: payload prepared →
 * founder approves → Gmail sends → logged (PRD §10, ADR-004).
 * `irreversible: true` is a SAFETY PROPERTY read by Story 3's Connector
 * boundary — flip it to false and this sends email to real people with
 * nobody watching. `irreversible: true` requires `connector` (enforced by
 * validateRegistry()).
 *
 * ⚠️ A DELIBERATE, FOUNDER-DIRECTED UPGRADE from launch_outreach's
 * draft-only design. This restructuring makes real sending an explicit
 * choice for P005 specifically, made once, here — not a default this
 * Action-authoring pattern applies elsewhere.
 *
 * Same recipient discipline as interview_customers.ts: only people named
 * with an email address in Company Context; no invented, guessed or
 * pattern-constructed addresses; an empty recipient list is a valid, honest
 * answer.
 */
export const GENERATE_PERSONALIZED_OUTREACH: ActionDef = {
  id: 'generate_personalized_outreach',
  program: 'P005',
  name: 'Generate & Send Personalized Outreach',
  kind: 'oneoff',
  irreversible: true,
  connector: 'gmail',
  instructionsRef: 'generate_personalized_outreach',
}
