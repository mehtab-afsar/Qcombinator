import type { ProgramTemplate } from '../../../types'

/**
 * P016 — Product. The natural sequel to P015 Validate: once a problem and its fit are validated,
 * this Program is where that evidence becomes a real vision, a sequenced roadmap, and the
 * concrete requirements the company builds next. Architecture/build execution itself is a later
 * Program (P017 — Build), out of scope here.
 *
 * Workbook Program Registry (`lib/prompts/executives/product/voice.ts:182-192`, S004's own
 * portfolio list — confirmed byte-identical against the source workbook's raw sharedStrings.xml):
 * id P016, name "Product", Purpose "Define the company's long-term product vision and roadmap,"
 * Primary Assets "Product Vision, Product Roadmap, Product Requirements Document (PRD), Success
 * Metrics, Product Backlog." No ids, no Actions — same gap P015 was seeded from (see
 * p015-validate.ts's own header for the precedent this file follows exactly).
 */
export const P016_PRODUCT: ProgramTemplate = {
  id: 'P016',
  handle: 'Product',
  name: 'Product',

  owner: 'product',

  /** Workbook Program Registry Purpose, verbatim. */
  objective: 'Define the company\'s long-term product vision and roadmap.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P015's own successMetric (see p015-validate.ts). No
   * successMetric exists in the workbook or the PRD for P016 either.
   */
  successMetric:
    'The Product Roadmap and Backlog stay traceable to the current Product Vision and to real ' +
    'traction against Success Metrics — never drifting into a wishlist disconnected from ' +
    'evidence — updated cycle over cycle as the company\'s priorities and traction evolve.',

  /**
   * ⚠️ NEWLY MINTED — AS054–AS058. The workbook names these five Primary Assets in prose only
   * (see the header above); AS001–AS053 are all already assigned across the other seeded
   * Programs, so these are the next five available ids, following the exact precedent
   * p015-validate.ts set for AS043–AS048 and p023-model.ts set for AS049–AS053.
   */
  assets: ['AS054', 'AS055', 'AS056', 'AS057', 'AS058'],

  /**
   * Five actions, authored (the workbook's Action Registry sheet is empty for every Program —
   * same situation P015's five and P023's five were in). Four form a real chain — each reads the
   * previous step's own output (AI SDR Milestone 1's mechanism, `ActionDef.dependsOn`, applied
   * here to Product for the first time): define the vision, then plan the roadmap from it, then
   * groom the backlog from the roadmap, then draft a PRD for the backlog's own top priority.
   * `review_success_metrics` stays independent, reading broadly from real traction data rather
   * than one specific prior step — same reasoning P005's `monitor_and_classify_responses` stays
   * independent (see monitor-and-classify-responses.ts).
   */
  actions: [
    'define_product_vision',
    'plan_product_roadmap',
    'prioritize_backlog',
    'draft_prd',
    'review_success_metrics',
  ],

  /** Layer 2 of the Composer — resolves to this Program's own authored Program Prompt. */
  programPromptRef: 'P016',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as every other Program (see p001-gtm.ts).
// The Program Prompt below carries its own "Autonomous Activation — Execute this Program
// whenever..." section, prose for the Composer to reason with, never a Registry field (ADR-008).
