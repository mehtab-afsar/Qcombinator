import type { ProgramTemplate } from '../../../types'

/**
 * P005 — Customer Acquisition. Owned by the Growth executive, alongside P001
 * GTM, P002 Brand Strategy, P003 Demand Generation and P004 Sales
 * Enablement.
 *
 * The fifth Program seeded — same shape as P001–P004, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P005, handle "Acquire", name "Customer
 * Acquisition", assets "AS015", actions "Generate Lead Lists, Launch
 * Outreach, Follow-up Prospects, Qualify Leads, Update CRM".
 */
export const P005_ACQUIRE: ProgramTemplate = {
  id: 'P005',
  handle: 'Acquire',
  name: 'Customer Acquisition',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective:
    'Design and optimise the complete customer acquisition engine from awareness to qualified opportunity.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's–P004's successMetric (see
   * p001-gtm.ts, p002-brand.ts, p003-demand.ts, p004-guide.ts). No
   * successMetric exists in the workbook or the PRD for P005 either. For
   * judgement and reporting only (PRD §14) — moves no score (ADR-005), gates
   * no execution. Derived from P005's own Purpose above.
   */
  successMetric:
    'Qualified opportunities entering the pipeline increase, and time from first touch to qualified opportunity shortens, as the funnel, channels and lead qualification framework in the Customer Acquisition Blueprint are put into practice.',

  /** P005-owned; AS015 is not shared with another Program. */
  assets: ['AS015'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (none reaches an
   * external system the way P001's interview_customers/post_team_update do).
   * `launch_outreach` and `follow_up_prospects` are the one genuinely close
   * call in this batch — see those two files for the reasoning.
   */
  actions: [
    'generate_lead_lists',
    'launch_outreach',
    'follow_up_prospects',
    'qualify_leads',
    'update_crm',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P005',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001–P004 (see
// p001-gtm.ts). The workbook's P005 prompt has its own "Autonomous Activation
// — Execute this Program whenever..." section (GTM/Demand Gen/Sales
// Enablement changed, acquisition performance declines, ...). It stays
// prose, for the Composer to reason with — never a Registry field (ADR-008).
