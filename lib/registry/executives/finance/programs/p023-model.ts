import type { ProgramTemplate } from '../../../types'

/**
 * P023 — Model. Owned by the Finance executive (CFO) — the FIRST Program
 * ever seeded for Finance, and the fourth executive (after Growth,
 * Operations, Product) to get a real Program in this codebase.
 *
 * Workbook Program Registry, verbatim Purpose: "Build robust financial
 * models, budgets and forecasts to support decision-making." Workbook Asset
 * names, verbatim: Financial Model, Budget, Cash Flow Forecast, Scenario
 * Analysis, Unit Economics Model (five).
 *
 * ⚠️ ASSET IDS AS049–AS053 ARE NEWLY MINTED FOR THIS BUILD — READ BEFORE
 * CHANGING THIS ARRAY.
 *
 * Same situation as Product's P015: the workbook's Asset Registry sheet
 * never assigned real AS0NN ids to any of Finance's named assets — its last
 * real assignment was AS048, minted for P015. The founder was asked directly
 * whether to invent new ids for Finance's named assets or leave this Program
 * asset-less, and explicitly chose to assign new ids now, sequentially,
 * starting immediately after the last assignment in the live Registry:
 *
 *   - AS049 — Financial Model
 *   - AS050 — Budget
 *   - AS051 — Cash Flow Forecast
 *   - AS052 — Scenario Analysis
 *   - AS053 — Unit Economics Model
 *
 * This is a deliberate, founder-authorized extension of the numbering, not
 * an error and not a gap to flag — recorded here exactly as it was decided,
 * the same way P015's header records the identical decision for Product. Do
 * not renumber, reuse, or drift outside AS049–AS053 without first checking
 * `lib/registry/index.ts` for what is actually seeded at the time.
 *
 * Actions, same situation as every other Program built in this codebase: the
 * workbook's Action Registry sheet is empty for everyone, and none of the
 * workbook's Program Registry rows past P014 even carry an Actions column.
 * So these five are authored here, not ported, in the workbook's house style
 * of verb-phrase names: "Build Financial Model, Update Budget, Run Scenario
 * Analysis, Review Unit Economics, Approve Financial Plan".
 */
export const P023_MODEL: ProgramTemplate = {
  id: 'P023',
  handle: 'Model',
  name: 'Model',

  owner: 'finance',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Build robust financial models, budgets and forecasts to support decision-making.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED. No successMetric exists in the workbook or the
   * PRD for P023. For judgement and reporting only (PRD §14) — moves no
   * score (ADR-005), gates no execution. Derived from P023's own Purpose
   * above.
   */
  successMetric:
    'Every founder decision that depends on money is backed by a current Financial Model, Budget and Cash Flow Forecast — with Scenario Analysis and the Unit Economics Model showing how resilient that decision is before it is made, cycle over cycle.',

  /** P023-owned; see the header comment above for why these ids are newly minted. */
  assets: ['AS049', 'AS050', 'AS051', 'AS052', 'AS053'],

  /**
   * Authored, workbook-style verb-phrase names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (no accounting,
   * modelling or billing-write Connector is registered today; the
   * registered Stripe connector is read/sync only).
   */
  actions: [
    'build_financial_model',
    'update_budget',
    'run_scenario_analysis',
    'review_unit_economics',
    'approve_financial_plan',
  ],

  /** Layer 2 of the Composer — resolves to the AUTHORED P023 prompt. */
  programPromptRef: 'P023',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as every other Program
// (see p001-gtm.ts). P023's own authored prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section. It stays prose,
// for the Composer to reason with — never a Registry field (ADR-008).
