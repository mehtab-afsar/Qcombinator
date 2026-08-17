import type { ProgramTemplate } from '../../../types'

/**
 * P007 — Pricing & Packaging. Owned by the Growth executive, alongside P001
 * GTM, P002 Brand Strategy, P003 Demand Generation, P004 Sales Enablement,
 * P005 Customer Acquisition and P006 Customer Success.
 *
 * The seventh Program seeded — same shape as P001–P006, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P007, handle "Pricing", name "Pricing &
 * Packaging", assets "AS017", actions "Review Pricing, Test New Pricing,
 * Approve Discounts, Update Commercial Terms".
 *
 * ⚠️ UNLIKE P001–P006, the workbook's Program Prompts sheet has NO entry for
 * P007 — only the Purpose below existed. `programPromptRef: 'P007'` resolves
 * to an AUTHORED prompt (lib/prompts/executives/growth/programs/p007.ts),
 * not a ported one. See that file's header for the reasoning.
 */
export const P007_PRICING: ProgramTemplate = {
  id: 'P007',
  handle: 'Pricing',
  name: 'Pricing & Packaging',

  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective: 'Define commercial pricing, packaging and revenue architecture.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as every prior Program's successMetric
   * (see p001-gtm.ts through p006-success.ts). No successMetric exists in
   * the workbook or the PRD for P007 either. For judgement and reporting
   * only (PRD §14) — moves no score (ADR-005), gates no execution. Derived
   * from P007's own Purpose above.
   */
  successMetric:
    'Realised price and gross margin rise, discounting narrows to governed exceptions, and the Pricing & Packaging Strategy gives the founder a defensible, evidence-based commercial architecture instead of ad hoc pricing calls.',

  /** P007-owned; AS017 is not shared with another Program. */
  assets: ['AS017'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All four are
   * internal/no-connector — see each ActionDef for why (the registered
   * Stripe connector is read/sync only; there is no `connector.send()`-style
   * capability to actually change a live price today).
   */
  actions: ['review_pricing', 'test_new_pricing', 'approve_discounts', 'update_commercial_terms'],

  /** Layer 2 of the Composer — resolves to the AUTHORED P007 prompt. */
  programPromptRef: 'P007',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001–P006 (see
// p001-gtm.ts). P007's own authored prompt has its own "Autonomous
// Activation — Execute this Program whenever..." section. It stays prose,
// for the Composer to reason with — never a Registry field (ADR-008).
