import type { ProgramTemplate } from '../../../types'

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
 *
 * ⚠️ ABSORBED P007 — PRICING & PACKAGING (Phase 10 Part 3, program
 * consolidation, 18 Aug 2026). P007 is no longer a standalone Program: its
 * one Asset (AS017) and four Actions (review_pricing, test_new_pricing,
 * approve_discounts, update_commercial_terms) now belong to P001, and its
 * Program Prompt content was merged into P001's own (see
 * `lib/prompts/executives/growth/programs/p001.ts`'s header). P001's own id
 * and handle did not change — this Program's scope simply grew.
 */
export const P001_GTM: ProgramTemplate = {
  id: 'P001',
  handle: 'GTM',
  name: 'Go-to-Market Strategy',
  owner: 'growth',

  /**
   * PRD §10, verbatim, plus P007's own Purpose absorbed on merge: "Define
   * commercial pricing, packaging and revenue architecture."
   */
  objective:
    'Define ICPs, positioning, messaging, commercial channels and pricing/packaging architecture to maximise sustainable revenue growth.',

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
   * PRD §10 ("Assets (corrected scope)") and the workbook agree exactly, plus AS017
   * absorbed from P007 on merge (Phase 10 Part 3).
   *
   * ⚠️ AS013 is NOT here. It is "Sales Enablement Kit", owned by P004 – Guide —
   * confirmed in the workbook's Asset Registry. An earlier draft of
   * Featureinventory listed it under P001; that was corrected (ADR-011).
   * __tests__/registry.test.ts asserts its absence so the error cannot return.
   */
  assets: ['AS001', 'AS002', 'AS003', 'AS004', 'AS005', 'AS017'],

  /**
   * PRD §10 names the first five. `post_team_update` is added on top — the Slack/MCP connector
   * proof case (`lib/registry/executives/growth/actions/post-team-update.ts`), postdating the workbook entirely.
   * `interview_customers` and `post_team_update` are the only irreversible actions here.
   *
   * The last four (`review_pricing` through `update_commercial_terms`) are P007's original
   * four, absorbed on merge (Phase 10 Part 3) — unchanged in content, just re-owned.
   */
  actions: [
    'validate_icps',
    'interview_customers',
    'prioritize_channels',
    'review_messaging',
    'approve_gtm_plan',
    'post_team_update',
    'review_pricing',
    'test_new_pricing',
    'approve_discounts',
    'update_commercial_terms',
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
