import type { ProgramTemplate } from '../../../types'

/**
 * P006 — Customer Success. Owned by the Growth executive, alongside P001
 * GTM, P002 Brand Strategy, P003 Demand Generation, P004 Sales Enablement
 * and P005 Customer Acquisition.
 *
 * The sixth Program seeded — same shape as P001–P005, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P006, handle "Success", name "Customer
 * Success", assets "AS016", actions "Schedule Onboarding, Conduct QBR,
 * Monitor Health Scores, Collect Feedback, Launch Upsell Campaign".
 */
export const P006_SUCCESS: ProgramTemplate = {
  id: 'P006',
  handle: 'Success',
  name: 'Customer Success',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Onboard, retain and expand customer relationships.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's–P005's successMetric (see
   * p001-gtm.ts, p002-brand.ts, p003-demand.ts, p004-guide.ts,
   * p005-acquire.ts). No successMetric exists in the workbook or the PRD for
   * P006 either. For judgement and reporting only (PRD §14) — moves no score
   * (ADR-005), gates no execution. Derived from P006's own Purpose above.
   */
  successMetric:
    'Net Revenue Retention rises and churn falls, as customer health is monitored, onboarding and QBRs run on schedule, and the Customer Success Framework surfaces expansion opportunities and renewal risk before they become losses.',

  /** P006-owned; AS016 is not shared with another Program. */
  assets: ['AS016'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (none reaches an
   * external system the way P001's interview_customers/post_team_update do —
   * there is no calendar or CRM-write Connector registered).
   */
  actions: [
    'schedule_onboarding',
    'conduct_qbr',
    'monitor_health_scores',
    'collect_feedback',
    'launch_upsell_campaign',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P006',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001–P005 (see
// p001-gtm.ts). The workbook's P006 prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section (new customer
// onboarded, customer health declines, renewal dates approach, ...). It
// stays prose, for the Composer to reason with — never a Registry field
// (ADR-008).
