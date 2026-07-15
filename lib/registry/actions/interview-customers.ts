import type { ActionDef } from '../types'

/**
 * interview_customers — send interview invitations to real people.
 *
 * ─── THE STORY 3 PROOF CASE ──────────────────────────────────────────────────
 * PRD §10: "Interview Customers sends interview invitations via the Gmail
 * connector — **irreversible → just-in-time approval** → executes → action_log."
 *
 * This is the ONLY irreversible Action in P001, and the one the whole Connector
 * layer gets built to prove: payload prepared → founder approves → Gmail sends →
 * logged. Nothing external happens without that approval (ADR-004).
 *
 * ⚠️ `irreversible: true` is a SAFETY PROPERTY, not a label. Story 3's Connector
 * boundary reads this flag to decide whether to stop and ask. Flip it to false
 * and this sends email to real people with nobody watching.
 *
 * DERIVED, NOT SEEDED. The workbook's Action Registry sheet is **empty** — no
 * action ids, no flags, no connectors anywhere in it. The Program Registry gives
 * only the free-text name "Interview Customers". Everything below comes from
 * PRD §10.
 */
export const INTERVIEW_CUSTOMERS: ActionDef = {
  id: 'interview_customers',
  name: 'Interview Customers',
  kind: 'oneoff',
  irreversible: true,
  connector: 'gmail',
  instructionsRef: 'interview_customers',
}
