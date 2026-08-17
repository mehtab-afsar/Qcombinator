import type { ProgramTemplate } from '../../../types'

/**
 * P005 — Customer Acquisition, positioned as the "AI SDR" flagship. Owned
 * by the Growth executive, alongside P001 GTM, P002 Brand Strategy, P003
 * Demand Generation and P004 Sales Enablement.
 *
 * The fifth Program seeded — same shape as P001–P004, different values.
 * Nothing about the Registry, Composer, Actions engine or Connector registry
 * changed to add it.
 *
 * Workbook Program Registry: id P005, handle "Acquire", name "Customer
 * Acquisition", assets "AS015", actions "Generate Lead Lists, Launch
 * Outreach, Follow-up Prospects, Qualify Leads, Update CRM" — the ORIGINAL
 * five, as first seeded.
 *
 * ⚠️ RESTRUCTURED — founder decision, 18 Aug 2026. The founder reviewed the
 * taxonomy and chose to make P005 the flagship, positioned as "AI SDR",
 * with its five broad actions rebuilt into a concrete nine-step pipeline
 * that reads as a real SDR workflow rather than an abstract "customer
 * acquisition program":
 *
 *  - `generate_lead_lists` DELETED — replaced by four more specific steps:
 *    find_target_companies, find_decision_makers, research_account,
 *    score_and_prioritize_leads.
 *  - `launch_outreach` DELETED and REPLACED by `generate_personalized_outreach`
 *    — not a straight rename. This is a real capability upgrade:
 *    `irreversible: true`, `connector: 'gmail'`. It is now the SECOND real
 *    Gmail-send Action in the whole system, alongside P001's
 *    `interview_customers` — see generate-personalized-outreach.ts.
 *  - `monitor_and_classify_responses` ADDED — genuinely new capability,
 *    nothing like it existed on P005 before. Classifies replies to
 *    outreach already sent and routes each lead onward.
 *  - `follow_up_prospects` and `update_crm` are UNCHANGED — same registry
 *    file, same prompt, same id.
 *  - `qualify_leads` is UNCHANGED as a registry entry; its PROMPT gained a
 *    short addition covering proposing a next meeting when qualification
 *    succeeds (folding in the founder's "Book Meeting" idea rather than
 *    adding a tenth Action for it) — see qualify-leads.ts in
 *    lib/prompts/executives/growth/actions/.
 *
 * AS015 (Customer Acquisition Blueprint) is untouched throughout — the
 * restructuring is scoped to Actions only.
 *
 * ⚠️ ABSORBED P004 — SALES ENABLEMENT (Phase 10 Part 3, program
 * consolidation, 18 Aug 2026). P004 is no longer a standalone Program: its
 * two Assets (AS013, AS014) and four Actions (train_sales_team,
 * update_sales_materials, prepare_customer_demo, review_win_loss_feedback)
 * now belong to P005, and its Program Prompt content was merged into P005's
 * own (see `lib/prompts/executives/growth/programs/p005.ts`'s header). P005
 * was chosen as the surviving id/handle — it carries the more developed
 * "AI SDR" pipeline (the nine-action restructuring above) — over P004's
 * generic four.
 */
export const P005_ACQUIRE: ProgramTemplate = {
  id: 'P005',
  handle: 'Acquire',
  name: 'Customer Acquisition & Sales Enablement',

  owner: 'growth',

  /**
   * Workbook Program Registry "Purpose", verbatim, plus P004's own Purpose
   * absorbed on merge: "Equip the company's sales team with the tools,
   * messaging and commercial intelligence required to consistently convert
   * qualified opportunities into customers."
   */
  objective:
    'Design and optimise the complete customer acquisition engine from awareness to qualified opportunity, and equip the sales team with the tools, messaging and commercial intelligence to convert those opportunities into customers.',

  /**
   * ⚠️ AUTHORED — NOT SEEDED, same as P001's–P004's successMetric (see
   * p001-gtm.ts, p002-brand.ts, p003-demand.ts, p004-guide.ts). No
   * successMetric exists in the workbook or the PRD for P005 either. For
   * judgement and reporting only (PRD §14) — moves no score (ADR-005), gates
   * no execution. Derived from P005's own Purpose above.
   */
  successMetric:
    'Qualified opportunities entering the pipeline increase, and time from first touch to qualified opportunity shortens, as the funnel, channels and lead qualification framework in the Customer Acquisition Blueprint are put into practice.',

  /**
   * AS015 is P005-owned, untouched by the restructuring. AS013 and AS014
   * are absorbed from P004 on merge (Phase 10 Part 3).
   */
  assets: ['AS015', 'AS013', 'AS014'],

  /**
   * Nine actions from the founder-directed AI SDR restructuring (see the
   * header comment above for the full before/after), plus four absorbed
   * from P004 on merge (Phase 10 Part 3) — unchanged in content, just
   * re-owned. Order follows the pipeline shape: find and qualify target
   * accounts, reach out, monitor replies, close the loop, then equip sales
   * to convert what the pipeline hands off.
   *
   * `generate_personalized_outreach` is the ONE irreversible action here —
   * `connector: 'gmail'` — the second real-send action in the system
   * alongside P001's `interview_customers`. Every other action, including
   * the four ex-P004 ones, is internal/no-connector: none reaches an
   * external system.
   */
  actions: [
    'find_target_companies',
    'find_decision_makers',
    'research_account',
    'score_and_prioritize_leads',
    'generate_personalized_outreach',
    'monitor_and_classify_responses',
    'follow_up_prospects',
    'qualify_leads',
    'update_crm',
    'train_sales_team',
    'update_sales_materials',
    'prepare_customer_demo',
    'review_win_loss_feedback',
  ],

  /** Layer 2 of the Composer — resolves to the workbook's Program Prompts row. */
  programPromptRef: 'P005',
}

// NOTE — deliberately NO `runsWhen`, same reasoning as P001–P004 (see
// p001-gtm.ts). The workbook's P005 prompt has its own "Autonomous Activation
// — Execute this Program whenever..." section (GTM/Demand Gen/Sales
// Enablement changed, acquisition performance declines, ...). It stays
// prose, for the Composer to reason with — never a Registry field (ADR-008).
