import type { ProgramTemplate } from '../../../types'

/**
 * P004 — Sales Enablement. Owned by the Growth executive, alongside P001 GTM,
 * P002 Brand Strategy and P003 Demand Generation.
 *
 * The fourth Program seeded — same shape as P001/P002/P003, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P004, handle "Guide", name "Sales
 * Enablement", assets "AS013 · AS014", actions "Train Sales Team, Update
 * Sales Materials, Prepare Customer Demo, Review Win/Loss Feedback".
 */
export const P004_GUIDE: ProgramTemplate = {
  id: 'P004',
  handle: 'Guide',
  name: 'Sales Enablement',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Equip the sales team with the assets required to qualify, persuade and close customers.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's/P002's/P003's successMetric (see
   * p001-gtm.ts, p002-brand.ts, p003-demand.ts). No successMetric exists in
   * the workbook or the PRD for P004 either. For judgement and reporting only
   * (PRD §14) — moves no score (ADR-005), gates no execution.
   */
  successMetric:
    'Win rate on qualified opportunities rises and sales cycles shorten as reps consistently use the Sales Enablement Kit and Proposal & ROI Toolkit to qualify, present and close.',

  /** P004-owned; neither AS013 nor AS014 is shared with another Program. */
  assets: ['AS013', 'AS014'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All four are
   * internal/no-connector — see each ActionDef for why (none reaches an
   * external system the way P001's interview_customers/post_team_update do).
   */
  actions: [
    'train_sales_team',
    'update_sales_materials',
    'prepare_customer_demo',
    'review_win_loss_feedback',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P004',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001/P002/P003 (see
// p001-gtm.ts). The workbook's P004 prompt has its own "Autonomous Activation
// — Execute this Program whenever..." section (GTM/Brand updated, new
// products launched, messaging changes, ...). It stays prose, for the
// Composer to reason with — never a Registry field (ADR-008).
