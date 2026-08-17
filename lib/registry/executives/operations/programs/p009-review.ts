import type { ProgramTemplate } from '../../../types'

/**
 * P009 — Review. Owned by the Operations executive (COO) — the FIRST Program
 * ever seeded for an executive other than Growth.
 *
 * Workbook Program Registry, verbatim Purpose: "Review company performance,
 * Q-Score, KPIs, financial performance and strategic progress." Actions,
 * workbook names verbatim: "Schedule Monthly Review, Review KPIs, Identify
 * Constraints, Assign Priorities, Approve Action Plan" — same situation as
 * every Growth Program: the workbook's Action Registry sheet is empty for
 * everyone, so these are authored here, not ported.
 *
 * ⚠️ ASSETS: THREE, NOT FIVE — READ BEFORE CHANGING THIS ARRAY.
 *
 * Both the workbook's Program Registry prose AND S005's own "Program
 * Portfolio" section (`lib/prompts/executives/operations/voice.ts`) name FIVE
 * Primary Assets for P009: Founder Dashboard, Monthly Review Report, KPI
 * Dashboard, Q-Score Trend, Executive Summary. But the workbook's Asset
 * Registry sheet — the sheet that assigns real, stable AS0NN ids — only ever
 * assigned ids to THREE of them:
 *
 *   - AS019 — Founder Dashboard
 *   - AS020 — KPI Dashboard
 *   - AS021 — Q-Score Trend Report
 *
 * "Monthly Review Report" and "Executive Summary" are named in prose but were
 * NEVER assigned a real Asset id anywhere in the source. This was previously
 * flagged, unresolved, in this Program's absence from `OPERATIONS.programs`
 * (see the old comment on `lib/registry/executives/operations/executive.ts`,
 * before this file existed): "the workbook's two sheets disagree ... Seeding
 * on top of that contradiction would bake it in. Resolve the workbook first,
 * then seed." This IS that resolution: seed only what the Asset Registry
 * actually assigned an id to. Inventing AS022/AS023 for the other two names
 * would manufacture ids the workbook never gave — the opposite of ADR-010
 * treating the workbook as the seeding source of truth. If the workbook is
 * ever corrected to assign real ids to "Monthly Review Report" and "Executive
 * Summary", add them then, the same way P002–P008 were each added as their
 * own real entries — never by guessing an id now.
 */
export const P009_REVIEW: ProgramTemplate = {
  id: 'P009',
  handle: 'Review',
  name: 'Review',

  owner: 'operations',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Review company performance, Q-Score, KPIs, financial performance and strategic progress.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED. No successMetric exists in the workbook or the
   * PRD for P009. For judgement and reporting only (PRD §14) — moves no score
   * (ADR-005), gates no execution. Derived from P009's own Purpose above.
   */
  successMetric:
    'Every Monthly Business Review gives the founder a current, evidence-based read on company performance, Q-Score movement, KPI trends and strategic progress — with the single biggest constraint named and a ranked action plan in place, cycle over cycle.',

  /** P009-owned; see the header comment above for why this is 3, not 5. */
  assets: ['AS019', 'AS020', 'AS021'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (no calendar,
   * analytics-write or project-management Connector is registered today).
   */
  actions: [
    'schedule_monthly_review',
    'review_kpis',
    'identify_constraints',
    'assign_priorities',
    'approve_action_plan',
  ],

  /** Layer 2 of the Composer — resolves to the AUTHORED P009 prompt. */
  programPromptRef: 'P009',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as every Growth Program
// (see p001-gtm.ts). P009's own authored prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section. It stays prose,
// for the Composer to reason with — never a Registry field (ADR-008).
