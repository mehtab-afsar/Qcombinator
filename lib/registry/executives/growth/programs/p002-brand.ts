import type { ProgramTemplate } from '../../../types'

/**
 * P002 — Brand Strategy. Owned by the Growth executive, alongside P001 GTM.
 *
 * The second Program seeded (F05's headline claim, proven by
 * `__tests__/registry.test.ts`'s "adding a Program requires no new route"
 * fixture before this file existed). Same shape as P001, different values —
 * nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P002, handle "Brand", name "Brand Strategy",
 * assets "AS004 · AS007 · AS008 · AS009", actions "Review Brand Positioning,
 * Update Website Copy, Define Brand Voice, Approve Messaging".
 */
export const P002_BRAND: ProgramTemplate = {
  id: 'P002',
  handle: 'Brand',
  name: 'Brand Strategy',
  owner: 'growth',

  /** Workbook Program Registry "Purpose", verbatim. */
  objective:
    "Define and continuously strengthen the company's brand identity, communication standards and narrative.",

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's (see p001-gtm.ts). No successMetric
   * exists in the workbook or the PRD for P002 either. For judgement and
   * reporting only (PRD §14) — moves no score (ADR-005), gates no execution.
   */
  successMetric:
    "The company's brand identity, guidelines and narrative are defined, internally consistent, and actively used across founder, sales and investor communication.",

  /**
   * AS004 is shared with P001 (the workbook's only two-Program Asset — see
   * as004-positioning.ts, updated alongside this file to declare
   * `sharedWith: ['P002']`). AS007–AS009 are P002-owned.
   */
  assets: ['AS004', 'AS007', 'AS008', 'AS009'],

  /**
   * Workbook Program Registry, verbatim names, snake_case ids. All four are
   * internal/no-connector — see each ActionDef for why (none reaches an
   * external system the way P001's interview_customers/post_team_update do).
   */
  actions: [
    'review_brand_positioning',
    'update_website_copy',
    'define_brand_voice',
    'approve_messaging',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P002',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001 (see p001-gtm.ts).
// The workbook's P002 prompt has its own "Autonomous Activation — Execute this
// Program whenever..." section (new product, new market, positioning changes,
// fundraising approaching, ...). It stays prose, for the Composer to reason
// with — never a Registry field (ADR-008).
