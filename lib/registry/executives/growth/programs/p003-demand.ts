import type { ProgramTemplate } from '../../../types'

/**
 * P003 — Demand Generation. Owned by the Growth executive, alongside P001 GTM
 * and P002 Brand Strategy.
 *
 * The third Program seeded — same shape as P001/P002, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P003, handle "Demand", name "Demand
 * Generation", assets "AS010 · AS011 · AS012", actions "Publish Content,
 * Launch Campaign, Optimize SEO, Run Webinar, Monitor Lead Generation".
 */
export const P003_DEMAND: ProgramTemplate = {
  id: 'P003',
  handle: 'Demand',
  name: 'Demand Generation',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective:
    'Build predictable inbound demand through content, SEO and campaigns.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's and P002's successMetric (see
   * p001-gtm.ts, p002-brand.ts). No successMetric exists in the workbook or
   * the PRD for P003 either. For judgement and reporting only (PRD §14) —
   * moves no score (ADR-005), gates no execution.
   */
  successMetric:
    'Qualified inbound pipeline grows quarter over quarter, driven by content, SEO and campaigns that convert visitors into sales-qualified opportunities.',

  /** P003-owned; none of AS010–AS012 are shared with another Program. */
  assets: ['AS010', 'AS011', 'AS012'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All five are
   * internal/no-connector — see each ActionDef for why (none reaches an
   * external system the way P001's interview_customers/post_team_update do).
   */
  actions: [
    'publish_content',
    'launch_campaign',
    'optimize_seo',
    'run_webinar',
    'monitor_lead_generation',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P003',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001/P002 (see
// p001-gtm.ts). The workbook's P003 prompt has its own "Autonomous Activation
// — Execute this Program whenever..." section (GTM/Brand updated, demand
// performance declines, new campaigns required, ...). It stays prose, for the
// Composer to reason with — never a Registry field (ADR-008).
