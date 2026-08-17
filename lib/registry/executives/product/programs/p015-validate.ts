import type { ProgramTemplate } from '../../../types'

/**
 * P015 — Validate. Owned by the Product executive (CTO) — the FIRST Program
 * ever seeded for an executive other than Growth or Operations.
 *
 * Workbook Program Registry, verbatim Purpose: "Validate customer problems,
 * product-market fit and feature priorities before development." Workbook
 * Asset names, verbatim: Customer Interview Report, PMF Scorecard, Problem
 * Validation Report, Product Feedback Log, Feature Prioritisation Matrix,
 * Validation Roadmap (six).
 *
 * ⚠️ ASSET IDS AS043–AS048 ARE NEWLY MINTED FOR THIS BUILD — READ BEFORE
 * CHANGING THIS ARRAY.
 *
 * Unlike every Program seeded before this one, the workbook's Asset Registry
 * sheet never assigned real AS0NN ids to any of Product's named assets — it
 * only ever assigned ids through AS042 (Operations' last Program). Every
 * other Asset id in this codebase was read directly off that sheet; these six
 * were not. The founder was asked directly whether to invent new ids for
 * Product's named assets or leave this Program asset-less, and explicitly
 * chose to assign new ids now, sequentially, starting immediately after the
 * workbook's own last assignment:
 *
 *   - AS043 — Customer Interview Report
 *   - AS044 — PMF Scorecard
 *   - AS045 — Problem Validation Report
 *   - AS046 — Product Feedback Log
 *   - AS047 — Feature Prioritisation Matrix
 *   - AS048 — Validation Roadmap
 *
 * This is a deliberate, founder-authorized extension of the numbering, not an
 * error and not a gap to flag — recorded here exactly as it was decided, the
 * same way P009's header records why that Program seeds three assets instead
 * of five. Do not renumber, reuse, or drift outside AS043–AS048 without first
 * checking `lib/registry/index.ts` for what is actually seeded at the time.
 *
 * Actions, same situation as every other Program built in this codebase: the
 * workbook's Action Registry sheet is empty for everyone, and none of the
 * workbook's Program Registry rows past P014 even carry an Actions column
 * (P015–P029's rows have Purpose + Assets only). So these five are authored
 * here, not ported, in the workbook's house style of verb-phrase names:
 * "Score Product-Market Fit, Prioritize Features, Validate Customer Problem,
 * Synthesize Customer Feedback, Approve Validation Roadmap".
 */
export const P015_VALIDATE: ProgramTemplate = {
  id: 'P015',
  handle: 'Validate',
  name: 'Validate',

  owner: 'product',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Validate customer problems, product-market fit and feature priorities before development.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED. No successMetric exists in the workbook or the
   * PRD for P015. For judgement and reporting only (PRD §14) — moves no score
   * (ADR-005), gates no execution. Derived from P015's own Purpose above.
   */
  successMetric:
    'Every feature reaching development traces to a validated customer problem and a current PMF read — with the Feature Prioritisation Matrix and Validation Roadmap reflecting that evidence, cycle over cycle.',

  /** P015-owned; see the header comment above for why these ids are newly minted. */
  assets: ['AS043', 'AS044', 'AS045', 'AS046', 'AS047', 'AS048'],

  /**
   * Authored, workbook-style verb-phrase names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (no interview-tooling,
   * analytics-write or roadmap/project-management Connector is registered
   * today).
   */
  actions: [
    'score_product_market_fit',
    'prioritize_features',
    'validate_customer_problem',
    'synthesize_customer_feedback',
    'approve_validation_roadmap',
  ],

  /** Layer 2 of the Composer — resolves to the AUTHORED P015 prompt. */
  programPromptRef: 'P015',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as every other Program
// (see p001-gtm.ts). P015's own authored prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section. It stays prose,
// for the Composer to reason with — never a Registry field (ADR-008).
