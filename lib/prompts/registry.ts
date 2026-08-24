/**
 * promptRef -> text.
 *
 * The Registry stores only REFS ('S003', 'P001', 'AS001'). This resolves a ref
 * to the prompt itself. Two small maps, so adding a Program's words is an entry
 * here — never a change to the Composer.
 *
 * Kept separate from compose.ts so the Composer stays logic and this stays a
 * lookup table.
 */

import { S003_GROWTH } from './executives/growth/voice'
import { S004_PRODUCT } from './executives/product/voice'
import { S005_OPERATIONS } from './executives/operations/voice'
import { S006_FINANCE } from './executives/finance/voice'
// No knowledge/ceo.ts barrel — it held no content of its own (just re-exported these
// two), so the two are imported directly from where they actually live.
import { S001_STRATEGY_SESSION } from './executives/ceo/s001'
import { S002_EXECUTIVE_CONTRACT } from './executives/ceo/s002'
import { P001_GTM_PROMPT } from './executives/growth/programs/p001'
import { P002_BRAND_PROMPT } from './executives/growth/programs/p002'
import { P003_DEMAND_PROMPT } from './executives/growth/programs/p003'
import { P005_ACQUIRE_PROMPT } from './executives/growth/programs/p005'
import { P006_SUCCESS_PROMPT } from './executives/growth/programs/p006'
import { P008_INTEL_PROMPT } from './executives/growth/programs/p008'
import { P009_REVIEW_PROMPT } from './executives/operations/programs/p009'
import { P015_VALIDATE_PROMPT } from './executives/product/programs/p015'
import { P016_PRODUCT_PROMPT } from './executives/product/programs/p016'
import { P023_MODEL_PROMPT } from './executives/finance/programs/p023'
import { AS001_ICP_PROFILES_PROMPT } from './executives/growth/assets/as001'
import { AS002_PAINS_GAINS_PROMPT } from './executives/growth/assets/as002'
import { AS003_BUYER_JOURNEY_PROMPT } from './executives/growth/assets/as003'
import { AS004_POSITIONING_PROMPT } from './executives/growth/assets/as004'
import { AS005_CHANNEL_STRATEGY_PROMPT } from './executives/growth/assets/as005'
import { AS007_BRAND_IDENTITY_PROMPT } from './executives/growth/assets/as007'
import { AS008_BRAND_GUIDELINES_PROMPT } from './executives/growth/assets/as008'
import { AS009_NARRATIVE_FRAMEWORK_PROMPT } from './executives/growth/assets/as009'
import { AS010_CONTENT_STRATEGY_PROMPT } from './executives/growth/assets/as010'
import { AS011_SEO_STRATEGY_PROMPT } from './executives/growth/assets/as011'
import { AS012_CAMPAIGN_STRATEGY_PROMPT } from './executives/growth/assets/as012'
import { AS013_SALES_ENABLEMENT_KIT_PROMPT } from './executives/growth/assets/as013'
import { AS014_PROPOSAL_ROI_TOOLKIT_PROMPT } from './executives/growth/assets/as014'
import { AS015_CUSTOMER_ACQUISITION_BLUEPRINT_PROMPT } from './executives/growth/assets/as015'
import { AS016_CUSTOMER_SUCCESS_FRAMEWORK_PROMPT } from './executives/growth/assets/as016'
import { AS017_PRICING_PACKAGING_STRATEGY_PROMPT } from './executives/growth/assets/as017'
import { AS018_MARKET_INTELLIGENCE_REPORT_PROMPT } from './executives/growth/assets/as018'
import { AS019_FOUNDER_DASHBOARD_PROMPT } from './executives/operations/assets/as019'
import { AS020_KPI_DASHBOARD_PROMPT } from './executives/operations/assets/as020'
import { AS021_QSCORE_TREND_REPORT_PROMPT } from './executives/operations/assets/as021'
import { AS043_CUSTOMER_INTERVIEW_REPORT_PROMPT } from './executives/product/assets/as043'
import { AS044_PMF_SCORECARD_PROMPT } from './executives/product/assets/as044'
import { AS045_PROBLEM_VALIDATION_REPORT_PROMPT } from './executives/product/assets/as045'
import { AS046_PRODUCT_FEEDBACK_LOG_PROMPT } from './executives/product/assets/as046'
import { AS047_FEATURE_PRIORITISATION_MATRIX_PROMPT } from './executives/product/assets/as047'
import { AS048_VALIDATION_ROADMAP_PROMPT } from './executives/product/assets/as048'
import { AS054_PRODUCT_VISION_PROMPT } from './executives/product/assets/as054'
import { AS055_PRODUCT_ROADMAP_PROMPT } from './executives/product/assets/as055'
import { AS056_PRODUCT_REQUIREMENTS_DOCUMENT_PROMPT } from './executives/product/assets/as056'
import { AS057_PRODUCT_SUCCESS_METRICS_PROMPT } from './executives/product/assets/as057'
import { AS058_PRODUCT_BACKLOG_PROMPT } from './executives/product/assets/as058'
import { AS049_FINANCIAL_MODEL_PROMPT } from './executives/finance/assets/as049'
import { AS050_BUDGET_PROMPT } from './executives/finance/assets/as050'
import { AS051_CASH_FLOW_FORECAST_PROMPT } from './executives/finance/assets/as051'
import { AS052_SCENARIO_ANALYSIS_PROMPT } from './executives/finance/assets/as052'
import { AS053_UNIT_ECONOMICS_MODEL_PROMPT } from './executives/finance/assets/as053'
import { VALIDATE_ICPS_PROMPT } from './executives/growth/actions/validate-icps'
import { INTERVIEW_CUSTOMERS_PROMPT } from './executives/growth/actions/interview-customers'
import { POST_TEAM_UPDATE_PROMPT } from './executives/growth/actions/post-team-update'
import { PRIORITIZE_CHANNELS_PROMPT } from './executives/growth/actions/prioritize-channels'
import { REVIEW_MESSAGING_PROMPT } from './executives/growth/actions/review-messaging'
import { APPROVE_GTM_PLAN_PROMPT } from './executives/growth/actions/approve-gtm-plan'
import { REVIEW_BRAND_POSITIONING_PROMPT } from './executives/growth/actions/review-brand-positioning'
import { UPDATE_WEBSITE_COPY_PROMPT } from './executives/growth/actions/update-website-copy'
import { DEFINE_BRAND_VOICE_PROMPT } from './executives/growth/actions/define-brand-voice'
import { APPROVE_MESSAGING_PROMPT } from './executives/growth/actions/approve-messaging'
import { PUBLISH_CONTENT_PROMPT } from './executives/growth/actions/publish-content'
import { LAUNCH_CAMPAIGN_PROMPT } from './executives/growth/actions/launch-campaign'
import { OPTIMIZE_SEO_PROMPT } from './executives/growth/actions/optimize-seo'
import { RUN_WEBINAR_PROMPT } from './executives/growth/actions/run-webinar'
import { MONITOR_LEAD_GENERATION_PROMPT } from './executives/growth/actions/monitor-lead-generation'
import { TRAIN_SALES_TEAM_PROMPT } from './executives/growth/actions/train-sales-team'
import { UPDATE_SALES_MATERIALS_PROMPT } from './executives/growth/actions/update-sales-materials'
import { PREPARE_CUSTOMER_DEMO_PROMPT } from './executives/growth/actions/prepare-customer-demo'
import { REVIEW_WIN_LOSS_FEEDBACK_PROMPT } from './executives/growth/actions/review-win-loss-feedback'
import { FIND_TARGET_COMPANIES_PROMPT } from './executives/growth/actions/find-target-companies'
import { FIND_DECISION_MAKERS_PROMPT } from './executives/growth/actions/find-decision-makers'
import { RESEARCH_ACCOUNT_PROMPT } from './executives/growth/actions/research-account'
import { SCORE_AND_PRIORITIZE_LEADS_PROMPT } from './executives/growth/actions/score-and-prioritize-leads'
import { GENERATE_PERSONALIZED_OUTREACH_PROMPT } from './executives/growth/actions/generate-personalized-outreach'
import { MONITOR_AND_CLASSIFY_RESPONSES_PROMPT } from './executives/growth/actions/monitor-and-classify-responses'
import { FOLLOW_UP_PROSPECTS_PROMPT } from './executives/growth/actions/follow-up-prospects'
import { QUALIFY_LEADS_PROMPT } from './executives/growth/actions/qualify-leads'
import { UPDATE_CRM_PROMPT } from './executives/growth/actions/update-crm'
import { SCHEDULE_ONBOARDING_PROMPT } from './executives/growth/actions/schedule-onboarding'
import { CONDUCT_QBR_PROMPT } from './executives/growth/actions/conduct-qbr'
import { MONITOR_HEALTH_SCORES_PROMPT } from './executives/growth/actions/monitor-health-scores'
import { COLLECT_FEEDBACK_PROMPT } from './executives/growth/actions/collect-feedback'
import { LAUNCH_UPSELL_CAMPAIGN_PROMPT } from './executives/growth/actions/launch-upsell-campaign'
import { REVIEW_PRICING_PROMPT } from './executives/growth/actions/review-pricing'
import { TEST_NEW_PRICING_PROMPT } from './executives/growth/actions/test-new-pricing'
import { APPROVE_DISCOUNTS_PROMPT } from './executives/growth/actions/approve-discounts'
import { UPDATE_COMMERCIAL_TERMS_PROMPT } from './executives/growth/actions/update-commercial-terms'
import { MONITOR_COMPETITORS_PROMPT } from './executives/growth/actions/monitor-competitors'
import { CONDUCT_CUSTOMER_INTERVIEWS_PROMPT } from './executives/growth/actions/conduct-customer-interviews'
import { UPDATE_MARKET_REPORT_PROMPT } from './executives/growth/actions/update-market-report'
import { TRACK_INDUSTRY_TRENDS_PROMPT } from './executives/growth/actions/track-industry-trends'
import { SCHEDULE_MONTHLY_REVIEW_PROMPT } from './executives/operations/actions/schedule-monthly-review'
import { REVIEW_KPIS_PROMPT } from './executives/operations/actions/review-kpis'
import { IDENTIFY_CONSTRAINTS_PROMPT } from './executives/operations/actions/identify-constraints'
import { ASSIGN_PRIORITIES_PROMPT } from './executives/operations/actions/assign-priorities'
import { APPROVE_ACTION_PLAN_PROMPT } from './executives/operations/actions/approve-action-plan'
import { SCORE_PRODUCT_MARKET_FIT_PROMPT } from './executives/product/actions/score-product-market-fit'
import { PRIORITIZE_FEATURES_PROMPT } from './executives/product/actions/prioritize-features'
import { VALIDATE_CUSTOMER_PROBLEM_PROMPT } from './executives/product/actions/validate-customer-problem'
import { SYNTHESIZE_CUSTOMER_FEEDBACK_PROMPT } from './executives/product/actions/synthesize-customer-feedback'
import { APPROVE_VALIDATION_ROADMAP_PROMPT } from './executives/product/actions/approve-validation-roadmap'
import { DEFINE_PRODUCT_VISION_PROMPT } from './executives/product/actions/define-product-vision'
import { PLAN_PRODUCT_ROADMAP_PROMPT } from './executives/product/actions/plan-product-roadmap'
import { PRIORITIZE_BACKLOG_PROMPT } from './executives/product/actions/prioritize-backlog'
import { DRAFT_PRD_PROMPT } from './executives/product/actions/draft-prd'
import { REVIEW_SUCCESS_METRICS_PROMPT } from './executives/product/actions/review-success-metrics'
import { BUILD_FINANCIAL_MODEL_PROMPT } from './executives/finance/actions/build-financial-model'
import { UPDATE_BUDGET_PROMPT } from './executives/finance/actions/update-budget'
import { RUN_SCENARIO_ANALYSIS_PROMPT } from './executives/finance/actions/run-scenario-analysis'
import { REVIEW_UNIT_ECONOMICS_PROMPT } from './executives/finance/actions/review-unit-economics'
import { APPROVE_FINANCIAL_PLAN_PROMPT } from './executives/finance/actions/approve-financial-plan'

/**
 * Executive System Prompts, by `Executive.systemPromptRef` — and, for the CEO, by
 * function (ADR-023).
 *
 * The CEO has two: the workbook's Executive Registry lists S001 (Strategy) and
 * S002 (Executive Contract) as separate System Prompt Refs for its two functions.
 * `Executive.systemPromptRef` holds only S001 (PRD §7.1 allows one), so S002 is
 * reached by `composeMandatePrompt({ kind: 'contract' })` rather than by looking
 * up the executive.
 *
 * The "P001 with S004 is invalid" rule (PRD §7.2) is a Registry relationship
 * check — `P001.owner === 'growth'` — which fails before any text is
 * fetched. Composition was always blocked by ownership, not by a missing
 * prompt: S005 was seeded alongside P009 (the first Program ever seeded for
 * an executive other than Growth), S004 alongside P015 (the first Program
 * ever seeded for an executive other than Growth or Operations), and S006 is
 * no longer absent either — it is Finance's voice, seeded alongside P023
 * (the first Program ever seeded for an executive other than Growth,
 * Operations or Product). Seeding each executive's real text does not change
 * why a mismatched pairing fails; it still fails on ownership, now simply
 * with a real prompt sitting behind the executive that gets wrongly paired.
 */
const EXECUTIVE_PROMPTS: Readonly<Record<string, string>> = {
  S001: S001_STRATEGY_SESSION,
  S002: S002_EXECUTIVE_CONTRACT,
  S003: S003_GROWTH,
  S004: S004_PRODUCT,
  S005: S005_OPERATIONS,
  S006: S006_FINANCE,
}

/** Program Prompts, by `ProgramTemplate.programPromptRef`. */
const PROGRAM_PROMPTS: Readonly<Record<string, string>> = {
  P001: P001_GTM_PROMPT,
  P002: P002_BRAND_PROMPT,
  P003: P003_DEMAND_PROMPT,
  P005: P005_ACQUIRE_PROMPT,
  P006: P006_SUCCESS_PROMPT,
  P008: P008_INTEL_PROMPT,
  P009: P009_REVIEW_PROMPT,
  P015: P015_VALIDATE_PROMPT,
  P016: P016_PRODUCT_PROMPT,
  P023: P023_MODEL_PROMPT,
}

/**
 * Asset & Action Instructions, by `AssetDef.instructionsRef` / `ActionDef.instructionsRef`.
 *
 * Assets use uppercase refs (`AS001`); Actions use lowercase snake_case matching their id
 * (`interview_customers`). That asymmetry comes from the Registry's own definitions — the keys
 * here must match `instructionsRef` EXACTLY, and a case mismatch is the likeliest way to break
 * this map, since it fails only at composition time.
 *
 * The Action prompts were written in this repo rather than lifted from the design workbook: the
 * workbook's Action Registry sheet is empty (see `missingwork.md`), which is why composing any
 * Action threw `PromptNotFoundError` until they existed. This file is the runtime source
 * regardless (ADR-010). Same story for P002's four Action prompts (review_brand_positioning,
 * update_website_copy, define_brand_voice, approve_messaging) and P003's five
 * (publish_content, launch_campaign, optimize_seo, run_webinar, monitor_lead_generation) — the
 * workbook names them but doesn't write them. Same story again for P004's
 * four Action prompts (train_sales_team, update_sales_materials,
 * prepare_customer_demo, review_win_loss_feedback) and P005's original five
 * (generate_lead_lists, launch_outreach, follow_up_prospects, qualify_leads,
 * update_crm). P005 was later restructured (18 Aug 2026, founder decision —
 * see p005-acquire.ts) into nine actions; generate_lead_lists and
 * launch_outreach were removed and six were authored here in their place —
 * find_target_companies, find_decision_makers, research_account,
 * score_and_prioritize_leads, generate_personalized_outreach,
 * monitor_and_classify_responses — for the same reason as everything else
 * in this list: the workbook's Action Registry sheet is empty. Same story
 * again for P006's five (schedule_onboarding,
 * conduct_qbr, monitor_health_scores, collect_feedback,
 * launch_upsell_campaign). Same story again for P007's four (review_pricing,
 * test_new_pricing, approve_discounts, update_commercial_terms) — their
 * Action Instructions are untouched and still keyed below by their own ids;
 * only their owning Program changed. P007 itself was merged into P001 on
 * 18 Aug 2026 (Phase 10 Part 3, program consolidation) — there is no `P007`
 * key in PROGRAM_PROMPTS anymore, and P007's Program Prompt content (itself
 * authored here originally, since the workbook had no Program Prompts entry
 * for P007 at all) now lives merged into p001.ts's own prompt. Same story
 * again for P008's four (monitor_competitors, conduct_customer_interviews,
 * update_market_report, track_industry_trends) — and P008's Program Prompt
 * itself was authored here too, for the same reason (see p008.ts's header).
 * Same story again for P009's five (schedule_monthly_review, review_kpis,
 * identify_constraints, assign_priorities, approve_action_plan) — and P009's
 * Program Prompt itself was authored here too, for the same reason (see
 * p009.ts's header). P009's three Asset Instructions (AS019, AS020, AS021)
 * were authored here as well — the workbook's Asset Registry gives each only
 * a one-line description, the same situation AS017/AS018 were in (see
 * as017.ts's header). Same story again for P015's five
 * (score_product_market_fit, prioritize_features, validate_customer_problem,
 * synthesize_customer_feedback, approve_validation_roadmap) — and P015's
 * Program Prompt itself was authored here too, for the same reason (see
 * p015.ts's header). P015's six Asset Instructions (AS043-AS048) were
 * authored here as well — but unlike every Asset before them, the workbook
 * gives them no description at all, not even one line: their ids were newly
 * minted for this build (see
 * `lib/registry/executives/product/programs/p015-validate.ts`), so both the
 * ids and the instruction text are new here, not lifted from any workbook
 * cell. Same story again for P023's five (build_financial_model,
 * update_budget, run_scenario_analysis, review_unit_economics,
 * approve_financial_plan) — and P023's Program Prompt itself was authored
 * here too, for the same reason (see p023.ts's header). P023's five Asset
 * Instructions (AS049-AS053) were authored here as well, in the same
 * newly-minted-id situation as AS043-AS048 (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 * Same story again for P016's five (define_product_vision, plan_product_roadmap,
 * prioritize_backlog, draft_prd, review_success_metrics) — and P016's Program Prompt itself was
 * authored here too, for the same reason (see p016.ts's header). P016's five Asset Instructions
 * (AS054-AS058) were authored here as well, in the same newly-minted-id situation as
 * AS043-AS048/AS049-AS053 (see `lib/registry/executives/product/programs/p016-product.ts`).
 */
const INSTRUCTION_PROMPTS: Readonly<Record<string, string>> = {
  AS001: AS001_ICP_PROFILES_PROMPT,
  AS002: AS002_PAINS_GAINS_PROMPT,
  AS003: AS003_BUYER_JOURNEY_PROMPT,
  AS004: AS004_POSITIONING_PROMPT,
  AS005: AS005_CHANNEL_STRATEGY_PROMPT,
  AS007: AS007_BRAND_IDENTITY_PROMPT,
  AS008: AS008_BRAND_GUIDELINES_PROMPT,
  AS009: AS009_NARRATIVE_FRAMEWORK_PROMPT,
  AS010: AS010_CONTENT_STRATEGY_PROMPT,
  AS011: AS011_SEO_STRATEGY_PROMPT,
  AS012: AS012_CAMPAIGN_STRATEGY_PROMPT,
  AS013: AS013_SALES_ENABLEMENT_KIT_PROMPT,
  AS014: AS014_PROPOSAL_ROI_TOOLKIT_PROMPT,
  AS015: AS015_CUSTOMER_ACQUISITION_BLUEPRINT_PROMPT,
  AS016: AS016_CUSTOMER_SUCCESS_FRAMEWORK_PROMPT,
  AS017: AS017_PRICING_PACKAGING_STRATEGY_PROMPT,
  AS018: AS018_MARKET_INTELLIGENCE_REPORT_PROMPT,
  AS019: AS019_FOUNDER_DASHBOARD_PROMPT,
  AS020: AS020_KPI_DASHBOARD_PROMPT,
  AS021: AS021_QSCORE_TREND_REPORT_PROMPT,
  AS043: AS043_CUSTOMER_INTERVIEW_REPORT_PROMPT,
  AS044: AS044_PMF_SCORECARD_PROMPT,
  AS045: AS045_PROBLEM_VALIDATION_REPORT_PROMPT,
  AS046: AS046_PRODUCT_FEEDBACK_LOG_PROMPT,
  AS047: AS047_FEATURE_PRIORITISATION_MATRIX_PROMPT,
  AS048: AS048_VALIDATION_ROADMAP_PROMPT,
  AS054: AS054_PRODUCT_VISION_PROMPT,
  AS055: AS055_PRODUCT_ROADMAP_PROMPT,
  AS056: AS056_PRODUCT_REQUIREMENTS_DOCUMENT_PROMPT,
  AS057: AS057_PRODUCT_SUCCESS_METRICS_PROMPT,
  AS058: AS058_PRODUCT_BACKLOG_PROMPT,
  AS049: AS049_FINANCIAL_MODEL_PROMPT,
  AS050: AS050_BUDGET_PROMPT,
  AS051: AS051_CASH_FLOW_FORECAST_PROMPT,
  AS052: AS052_SCENARIO_ANALYSIS_PROMPT,
  AS053: AS053_UNIT_ECONOMICS_MODEL_PROMPT,
  validate_icps: VALIDATE_ICPS_PROMPT,
  interview_customers: INTERVIEW_CUSTOMERS_PROMPT,
  prioritize_channels: PRIORITIZE_CHANNELS_PROMPT,
  review_messaging: REVIEW_MESSAGING_PROMPT,
  approve_gtm_plan: APPROVE_GTM_PLAN_PROMPT,
  post_team_update: POST_TEAM_UPDATE_PROMPT,
  review_brand_positioning: REVIEW_BRAND_POSITIONING_PROMPT,
  update_website_copy: UPDATE_WEBSITE_COPY_PROMPT,
  define_brand_voice: DEFINE_BRAND_VOICE_PROMPT,
  approve_messaging: APPROVE_MESSAGING_PROMPT,
  publish_content: PUBLISH_CONTENT_PROMPT,
  launch_campaign: LAUNCH_CAMPAIGN_PROMPT,
  optimize_seo: OPTIMIZE_SEO_PROMPT,
  run_webinar: RUN_WEBINAR_PROMPT,
  monitor_lead_generation: MONITOR_LEAD_GENERATION_PROMPT,
  train_sales_team: TRAIN_SALES_TEAM_PROMPT,
  update_sales_materials: UPDATE_SALES_MATERIALS_PROMPT,
  prepare_customer_demo: PREPARE_CUSTOMER_DEMO_PROMPT,
  review_win_loss_feedback: REVIEW_WIN_LOSS_FEEDBACK_PROMPT,
  find_target_companies: FIND_TARGET_COMPANIES_PROMPT,
  find_decision_makers: FIND_DECISION_MAKERS_PROMPT,
  research_account: RESEARCH_ACCOUNT_PROMPT,
  score_and_prioritize_leads: SCORE_AND_PRIORITIZE_LEADS_PROMPT,
  generate_personalized_outreach: GENERATE_PERSONALIZED_OUTREACH_PROMPT,
  monitor_and_classify_responses: MONITOR_AND_CLASSIFY_RESPONSES_PROMPT,
  follow_up_prospects: FOLLOW_UP_PROSPECTS_PROMPT,
  qualify_leads: QUALIFY_LEADS_PROMPT,
  update_crm: UPDATE_CRM_PROMPT,
  schedule_onboarding: SCHEDULE_ONBOARDING_PROMPT,
  conduct_qbr: CONDUCT_QBR_PROMPT,
  monitor_health_scores: MONITOR_HEALTH_SCORES_PROMPT,
  collect_feedback: COLLECT_FEEDBACK_PROMPT,
  launch_upsell_campaign: LAUNCH_UPSELL_CAMPAIGN_PROMPT,
  review_pricing: REVIEW_PRICING_PROMPT,
  test_new_pricing: TEST_NEW_PRICING_PROMPT,
  approve_discounts: APPROVE_DISCOUNTS_PROMPT,
  update_commercial_terms: UPDATE_COMMERCIAL_TERMS_PROMPT,
  monitor_competitors: MONITOR_COMPETITORS_PROMPT,
  conduct_customer_interviews: CONDUCT_CUSTOMER_INTERVIEWS_PROMPT,
  update_market_report: UPDATE_MARKET_REPORT_PROMPT,
  track_industry_trends: TRACK_INDUSTRY_TRENDS_PROMPT,
  schedule_monthly_review: SCHEDULE_MONTHLY_REVIEW_PROMPT,
  review_kpis: REVIEW_KPIS_PROMPT,
  identify_constraints: IDENTIFY_CONSTRAINTS_PROMPT,
  assign_priorities: ASSIGN_PRIORITIES_PROMPT,
  approve_action_plan: APPROVE_ACTION_PLAN_PROMPT,
  score_product_market_fit: SCORE_PRODUCT_MARKET_FIT_PROMPT,
  prioritize_features: PRIORITIZE_FEATURES_PROMPT,
  validate_customer_problem: VALIDATE_CUSTOMER_PROBLEM_PROMPT,
  synthesize_customer_feedback: SYNTHESIZE_CUSTOMER_FEEDBACK_PROMPT,
  approve_validation_roadmap: APPROVE_VALIDATION_ROADMAP_PROMPT,
  define_product_vision: DEFINE_PRODUCT_VISION_PROMPT,
  plan_product_roadmap: PLAN_PRODUCT_ROADMAP_PROMPT,
  prioritize_backlog: PRIORITIZE_BACKLOG_PROMPT,
  draft_prd: DRAFT_PRD_PROMPT,
  review_success_metrics: REVIEW_SUCCESS_METRICS_PROMPT,
  build_financial_model: BUILD_FINANCIAL_MODEL_PROMPT,
  update_budget: UPDATE_BUDGET_PROMPT,
  run_scenario_analysis: RUN_SCENARIO_ANALYSIS_PROMPT,
  review_unit_economics: REVIEW_UNIT_ECONOMICS_PROMPT,
  approve_financial_plan: APPROVE_FINANCIAL_PLAN_PROMPT,
}

/**
 * Thrown when a ref has no text.
 *
 * Never returns an empty string. An empty layer is worse than an error: the model
 * still answers, fluently, with a quarter of its instructions missing — and
 * nothing looks broken.
 */
export class PromptNotFoundError extends Error {
  constructor(kind: string, ref: string) {
    super(`No ${kind} prompt registered for ref '${ref}'`)
    this.name = 'PromptNotFoundError'
  }
}

export function getExecutivePrompt(ref: string): string {
  const text = EXECUTIVE_PROMPTS[ref]
  if (!text) throw new PromptNotFoundError('executive system', ref)
  return text
}

export function getProgramPrompt(ref: string): string {
  const text = PROGRAM_PROMPTS[ref]
  if (!text) throw new PromptNotFoundError('program', ref)
  return text
}

export function getInstructionPrompt(ref: string): string {
  const text = INSTRUCTION_PROMPTS[ref]
  if (!text) throw new PromptNotFoundError('asset/action instruction', ref)
  return text
}

/** Which refs have text — for tests and diagnostics. */
export function listRegisteredPromptRefs(): {
  executive: string[]
  program: string[]
  instruction: string[]
} {
  return {
    executive: Object.keys(EXECUTIVE_PROMPTS),
    program: Object.keys(PROGRAM_PROMPTS),
    instruction: Object.keys(INSTRUCTION_PROMPTS),
  }
}
