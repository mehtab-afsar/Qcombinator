import type { ProgramTemplate } from '../../../types'

/**
 * P008 — Market Intelligence. Owned by the Growth executive, alongside P001
 * GTM & Strategy (which absorbed P007 Pricing & Packaging on merge, Phase 10
 * Part 3), P002 Brand Strategy, P003 Demand Generation, P004 Sales
 * Enablement and P005 Customer Acquisition, P006 Customer Success.
 *
 * The eighth and LAST Program PRD §7.1 assigns to Growth — same shape as
 * P001–P006, different values. Nothing about the Registry, Composer, Actions
 * engine or Connector registry changed to add it. Growth's roster is now
 * P001–P006 + P008 (seven Programs; P007 no longer exists as a standalone id).
 *
 * Workbook Program Registry: id P008, handle "Intel", name "Market
 * Intelligence", assets "AS018", actions "Monitor Competitors, Conduct
 * Customer Interviews, Update Market Report, Track Industry Trends".
 *
 * ⚠️ SAME SITUATION AS P007: the workbook's Program Prompts sheet has NO
 * entry for P008 — only the Purpose below existed. `programPromptRef: 'P008'`
 * resolves to an AUTHORED prompt (lib/prompts/executives/growth/programs/p008.ts),
 * not a ported one. See that file's header for the reasoning.
 */
export const P008_INTEL: ProgramTemplate = {
  id: 'P008',
  handle: 'Intel',
  name: 'Market Intelligence',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Continuously monitor competitors, customers and market developments.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as every prior Program's successMetric
   * (see p001-gtm.ts through p007-pricing.ts). No successMetric exists in
   * the workbook or the PRD for P008 either. For judgement and reporting
   * only (PRD §14) — moves no score (ADR-005), gates no execution. Derived
   * from P008's own Purpose above.
   */
  successMetric:
    'The company enters every strategic decision with a current, evidence-based read on its competitors, customers and market — so pricing, GTM and product calls are made ahead of the market, not in reaction to it, and the Market Intelligence Report stays the Founder\'s trusted single source for "what is actually happening out there."',

  /** P008-owned; AS018 is not shared with another Program. */
  assets: ['AS018'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All four are
   * internal/no-connector — see each ActionDef for why (there is no
   * competitive-intelligence, news-monitoring or outreach-send Connector
   * registered today).
   */
  actions: [
    'monitor_competitors',
    'conduct_customer_interviews',
    'update_market_report',
    'track_industry_trends',
  ],

  /** Layer 2 of the Composer — resolves to the AUTHORED P008 prompt. */
  programPromptRef: 'P008',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001–P007 (see
// p001-gtm.ts). P008's own authored prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section. It stays prose,
// for the Composer to reason with — never a Registry field (ADR-008).
