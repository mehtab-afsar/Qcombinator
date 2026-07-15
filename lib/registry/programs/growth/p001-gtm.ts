import type { ProgramTemplate } from '../../types'

/**
 * P001 — Go-to-Market Strategy. Owned by the Growth executive.
 *
 * The first Program proven end to end (ADR-011) — and only the first. Nothing
 * here is special-cased: every other Program is this same shape with different
 * values, which is the entire point of a Registry.
 *
 * Sources, reconciled:
 *  - Workbook Program Registry → id, handle, name, assets, action names
 *  - PRD §10 → the authoritative asset list and the irreversible Action
 *
 * The two agree on P001. Where they could have diverged, the PRD wins.
 */
export const P001_GTM: ProgramTemplate = {
  id: 'P001',
  handle: 'GTM',
  name: 'Go-to-Market Strategy',
  owner: 'growth',

  /** PRD §10, verbatim. The workbook's Program Registry "Purpose" matches. */
  objective:
    'Define ICPs, positioning, messaging and commercial channels to maximise sustainable revenue growth.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED. Do not mistake this for workbook data.
   *
   * No successMetric exists anywhere: the workbook has no such column and no such
   * prompt section, and PRD §10 does not give one. PRD §14 explains why — the GTM
   * outcome metric was deliberately deferred ("not needed for Phase 1"), because
   * the Outcome Loop is out of scope (ADR-009). §7.1 still requires the field, so
   * one had to be written.
   *
   * This sentence is derived from the workbook's own P001 Purpose. It is for
   * judgement and reporting only (PRD §14): it moves no score (ADR-005) and gates
   * no execution. Replace it whenever the real metric is agreed.
   */
  successMetric:
    'The company has an executable commercial direction: priority ICPs are chosen on customer evidence, positioning is validated, and acquisition channels are prioritised by sustainable revenue return.',

  /**
   * PRD §10 ("Assets (corrected scope)") and the workbook agree exactly.
   *
   * ⚠️ AS013 is NOT here. It is "Sales Enablement Kit", owned by P004 – Guide —
   * confirmed in the workbook's Asset Registry. An earlier draft of
   * Featureinventory listed it under P001; that was corrected (ADR-011).
   * __tests__/registry.test.ts asserts its absence so the error cannot return.
   */
  assets: ['AS001', 'AS002', 'AS003', 'AS004', 'AS005'],

  /** PRD §10. Only `interview_customers` is irreversible — see its definition. */
  actions: [
    'validate_icps',
    'interview_customers',
    'prioritize_channels',
    'review_messaging',
    'approve_gtm_plan',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P001',
}

// NOTE — deliberately NO `runsWhen`, and the temptation here is real (ADR-008).
//
// The workbook's P001 prompt contains an "Autonomous Activation — Execute this
// Program whenever: ... Market Readiness becomes the primary business constraint,
// the company launches a new product, positioning changes ..." section. It is
// sitting right there in the seed source, reading like a specification.
//
// It must stay prose. The Contract decides what is active; the Rhythm runs every
// contract-active Program every cycle, with no event-aware skipping in v1.
// Event-awareness is a deferred COST optimisation, not a v1 behaviour, and lifting
// that prose into a field would quietly undo the decision.
