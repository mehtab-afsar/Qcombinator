/**
 * The Registry — loader and lookups.
 *
 * The authoritative runtime source for Executives, Programs, Assets and Actions
 * (ADR-010). Adding a capability means adding an entry below — never a route
 * (CLAUDE.md §0.1).
 *
 * Nothing here reads the Excel workbook. It was read once, by hand, to seed these
 * files; at runtime it does not exist.
 */

import {
  ActionNotFoundError,
  AssetNotFoundError,
  ExecutiveNotFoundError,
  ProgramNotFoundError,
  RegistryValidationError,
  type ActionDef,
  type ActionId,
  type AssetDef,
  type AssetId,
  type Executive,
  type ExecutiveId,
  type ProgramId,
  type ProgramTemplate,
} from './types'

import { CEO } from './executives/ceo/executive'
import { GROWTH } from './executives/growth/executive'
import { PRODUCT } from './executives/product/executive'
import { OPERATIONS } from './executives/operations/executive'
import { FINANCE } from './executives/finance/executive'

import { P001_GTM } from './executives/growth/programs/p001-gtm'
import { P002_BRAND } from './executives/growth/programs/p002-brand'
import { P003_DEMAND } from './executives/growth/programs/p003-demand'
import { P005_ACQUIRE } from './executives/growth/programs/p005-acquire'
import { P006_SUCCESS } from './executives/growth/programs/p006-success'
import { P008_INTEL } from './executives/growth/programs/p008-intel'
import { P009_REVIEW } from './executives/operations/programs/p009-review'
import { P015_VALIDATE } from './executives/product/programs/p015-validate'
import { P023_MODEL } from './executives/finance/programs/p023-model'

import { AS001_ICP_PROFILES } from './executives/growth/assets/as001-icp'
import { AS002_PAINS_GAINS_MATRIX } from './executives/growth/assets/as002-pains-gains'
import { AS003_BUYER_JOURNEY_MAP } from './executives/growth/assets/as003-buyer-journey'
import { AS004_POSITIONING_MESSAGING } from './executives/growth/assets/as004-positioning'
import { AS005_CHANNEL_STRATEGY } from './executives/growth/assets/as005-channel-strategy'
import { AS007_BRAND_IDENTITY } from './executives/growth/assets/as007-brand-identity'
import { AS008_BRAND_GUIDELINES } from './executives/growth/assets/as008-brand-guidelines'
import { AS009_NARRATIVE_FRAMEWORK } from './executives/growth/assets/as009-narrative-framework'
import { AS010_CONTENT_STRATEGY } from './executives/growth/assets/as010-content-strategy'
import { AS011_SEO_STRATEGY } from './executives/growth/assets/as011-seo-strategy'
import { AS012_CAMPAIGN_STRATEGY } from './executives/growth/assets/as012-campaign-strategy'
import { AS013_SALES_ENABLEMENT_KIT } from './executives/growth/assets/as013-sales-enablement-kit'
import { AS014_PROPOSAL_ROI_TOOLKIT } from './executives/growth/assets/as014-proposal-roi-toolkit'
import { AS015_CUSTOMER_ACQUISITION_BLUEPRINT } from './executives/growth/assets/as015-customer-acquisition-blueprint'
import { AS016_CUSTOMER_SUCCESS_FRAMEWORK } from './executives/growth/assets/as016-customer-success-framework'
import { AS017_PRICING_PACKAGING_STRATEGY } from './executives/growth/assets/as017-pricing-packaging-strategy'
import { AS018_MARKET_INTELLIGENCE_REPORT } from './executives/growth/assets/as018-market-intelligence-report'
import { AS019_FOUNDER_DASHBOARD } from './executives/operations/assets/as019-founder-dashboard'
import { AS020_KPI_DASHBOARD } from './executives/operations/assets/as020-kpi-dashboard'
import { AS021_QSCORE_TREND_REPORT } from './executives/operations/assets/as021-qscore-trend-report'
import { AS043_CUSTOMER_INTERVIEW_REPORT } from './executives/product/assets/as043-customer-interview-report'
import { AS044_PMF_SCORECARD } from './executives/product/assets/as044-pmf-scorecard'
import { AS045_PROBLEM_VALIDATION_REPORT } from './executives/product/assets/as045-problem-validation-report'
import { AS046_PRODUCT_FEEDBACK_LOG } from './executives/product/assets/as046-product-feedback-log'
import { AS047_FEATURE_PRIORITISATION_MATRIX } from './executives/product/assets/as047-feature-prioritisation-matrix'
import { AS048_VALIDATION_ROADMAP } from './executives/product/assets/as048-validation-roadmap'
import { AS049_FINANCIAL_MODEL } from './executives/finance/assets/as049-financial-model'
import { AS050_BUDGET } from './executives/finance/assets/as050-budget'
import { AS051_CASH_FLOW_FORECAST } from './executives/finance/assets/as051-cash-flow-forecast'
import { AS052_SCENARIO_ANALYSIS } from './executives/finance/assets/as052-scenario-analysis'
import { AS053_UNIT_ECONOMICS_MODEL } from './executives/finance/assets/as053-unit-economics-model'

import { VALIDATE_ICPS } from './executives/growth/actions/validate-icps'
import { INTERVIEW_CUSTOMERS } from './executives/growth/actions/interview-customers'
import { PRIORITIZE_CHANNELS } from './executives/growth/actions/prioritize-channels'
import { REVIEW_MESSAGING } from './executives/growth/actions/review-messaging'
import { APPROVE_GTM_PLAN } from './executives/growth/actions/approve-gtm-plan'
import { POST_TEAM_UPDATE } from './executives/growth/actions/post-team-update'
import { REVIEW_BRAND_POSITIONING } from './executives/growth/actions/review-brand-positioning'
import { UPDATE_WEBSITE_COPY } from './executives/growth/actions/update-website-copy'
import { DEFINE_BRAND_VOICE } from './executives/growth/actions/define-brand-voice'
import { APPROVE_MESSAGING } from './executives/growth/actions/approve-messaging'
import { PUBLISH_CONTENT } from './executives/growth/actions/publish-content'
import { LAUNCH_CAMPAIGN } from './executives/growth/actions/launch-campaign'
import { OPTIMIZE_SEO } from './executives/growth/actions/optimize-seo'
import { RUN_WEBINAR } from './executives/growth/actions/run-webinar'
import { MONITOR_LEAD_GENERATION } from './executives/growth/actions/monitor-lead-generation'
import { TRAIN_SALES_TEAM } from './executives/growth/actions/train-sales-team'
import { UPDATE_SALES_MATERIALS } from './executives/growth/actions/update-sales-materials'
import { PREPARE_CUSTOMER_DEMO } from './executives/growth/actions/prepare-customer-demo'
import { REVIEW_WIN_LOSS_FEEDBACK } from './executives/growth/actions/review-win-loss-feedback'
import { FIND_TARGET_COMPANIES } from './executives/growth/actions/find-target-companies'
import { FIND_DECISION_MAKERS } from './executives/growth/actions/find-decision-makers'
import { RESEARCH_ACCOUNT } from './executives/growth/actions/research-account'
import { SCORE_AND_PRIORITIZE_LEADS } from './executives/growth/actions/score-and-prioritize-leads'
import { GENERATE_PERSONALIZED_OUTREACH } from './executives/growth/actions/generate-personalized-outreach'
import { MONITOR_AND_CLASSIFY_RESPONSES } from './executives/growth/actions/monitor-and-classify-responses'
import { FOLLOW_UP_PROSPECTS } from './executives/growth/actions/follow-up-prospects'
import { QUALIFY_LEADS } from './executives/growth/actions/qualify-leads'
import { UPDATE_CRM } from './executives/growth/actions/update-crm'
import { SCHEDULE_ONBOARDING } from './executives/growth/actions/schedule-onboarding'
import { CONDUCT_QBR } from './executives/growth/actions/conduct-qbr'
import { MONITOR_HEALTH_SCORES } from './executives/growth/actions/monitor-health-scores'
import { COLLECT_FEEDBACK } from './executives/growth/actions/collect-feedback'
import { LAUNCH_UPSELL_CAMPAIGN } from './executives/growth/actions/launch-upsell-campaign'
import { REVIEW_PRICING } from './executives/growth/actions/review-pricing'
import { TEST_NEW_PRICING } from './executives/growth/actions/test-new-pricing'
import { APPROVE_DISCOUNTS } from './executives/growth/actions/approve-discounts'
import { UPDATE_COMMERCIAL_TERMS } from './executives/growth/actions/update-commercial-terms'
import { MONITOR_COMPETITORS } from './executives/growth/actions/monitor-competitors'
import { CONDUCT_CUSTOMER_INTERVIEWS } from './executives/growth/actions/conduct-customer-interviews'
import { UPDATE_MARKET_REPORT } from './executives/growth/actions/update-market-report'
import { TRACK_INDUSTRY_TRENDS } from './executives/growth/actions/track-industry-trends'

import { SCHEDULE_MONTHLY_REVIEW } from './executives/operations/actions/schedule-monthly-review'
import { REVIEW_KPIS } from './executives/operations/actions/review-kpis'
import { IDENTIFY_CONSTRAINTS } from './executives/operations/actions/identify-constraints'
import { ASSIGN_PRIORITIES } from './executives/operations/actions/assign-priorities'
import { APPROVE_ACTION_PLAN } from './executives/operations/actions/approve-action-plan'

import { SCORE_PRODUCT_MARKET_FIT } from './executives/product/actions/score-product-market-fit'
import { PRIORITIZE_FEATURES } from './executives/product/actions/prioritize-features'
import { VALIDATE_CUSTOMER_PROBLEM } from './executives/product/actions/validate-customer-problem'
import { SYNTHESIZE_CUSTOMER_FEEDBACK } from './executives/product/actions/synthesize-customer-feedback'
import { APPROVE_VALIDATION_ROADMAP } from './executives/product/actions/approve-validation-roadmap'

import { BUILD_FINANCIAL_MODEL } from './executives/finance/actions/build-financial-model'
import { UPDATE_BUDGET } from './executives/finance/actions/update-budget'
import { RUN_SCENARIO_ANALYSIS } from './executives/finance/actions/run-scenario-analysis'
import { REVIEW_UNIT_ECONOMICS } from './executives/finance/actions/review-unit-economics'
import { APPROVE_FINANCIAL_PLAN } from './executives/finance/actions/approve-financial-plan'

export * from './types'

// ─── The catalogue ────────────────────────────────────────────────────────────
// To add a Program: write its file, import it, add it here. That is the whole
// procedure — no route, no migration, no engine change.

const EXECUTIVES: readonly Executive[] = [CEO, GROWTH, PRODUCT, OPERATIONS, FINANCE]

const PROGRAMS: readonly ProgramTemplate[] = [
  P001_GTM,
  P002_BRAND,
  P003_DEMAND,
  P005_ACQUIRE,
  P006_SUCCESS,
  P008_INTEL,
  P009_REVIEW,
  P015_VALIDATE,
  P023_MODEL,
]

const ASSETS: readonly AssetDef[] = [
  AS001_ICP_PROFILES,
  AS002_PAINS_GAINS_MATRIX,
  AS003_BUYER_JOURNEY_MAP,
  AS004_POSITIONING_MESSAGING,
  AS005_CHANNEL_STRATEGY,
  AS007_BRAND_IDENTITY,
  AS008_BRAND_GUIDELINES,
  AS009_NARRATIVE_FRAMEWORK,
  AS010_CONTENT_STRATEGY,
  AS011_SEO_STRATEGY,
  AS012_CAMPAIGN_STRATEGY,
  AS013_SALES_ENABLEMENT_KIT,
  AS014_PROPOSAL_ROI_TOOLKIT,
  AS015_CUSTOMER_ACQUISITION_BLUEPRINT,
  AS016_CUSTOMER_SUCCESS_FRAMEWORK,
  AS017_PRICING_PACKAGING_STRATEGY,
  AS018_MARKET_INTELLIGENCE_REPORT,
  AS019_FOUNDER_DASHBOARD,
  AS020_KPI_DASHBOARD,
  AS021_QSCORE_TREND_REPORT,
  AS043_CUSTOMER_INTERVIEW_REPORT,
  AS044_PMF_SCORECARD,
  AS045_PROBLEM_VALIDATION_REPORT,
  AS046_PRODUCT_FEEDBACK_LOG,
  AS047_FEATURE_PRIORITISATION_MATRIX,
  AS048_VALIDATION_ROADMAP,
  AS049_FINANCIAL_MODEL,
  AS050_BUDGET,
  AS051_CASH_FLOW_FORECAST,
  AS052_SCENARIO_ANALYSIS,
  AS053_UNIT_ECONOMICS_MODEL,
]

const ACTIONS: readonly ActionDef[] = [
  VALIDATE_ICPS,
  INTERVIEW_CUSTOMERS,
  PRIORITIZE_CHANNELS,
  REVIEW_MESSAGING,
  APPROVE_GTM_PLAN,
  POST_TEAM_UPDATE,
  REVIEW_BRAND_POSITIONING,
  UPDATE_WEBSITE_COPY,
  DEFINE_BRAND_VOICE,
  APPROVE_MESSAGING,
  PUBLISH_CONTENT,
  LAUNCH_CAMPAIGN,
  OPTIMIZE_SEO,
  RUN_WEBINAR,
  MONITOR_LEAD_GENERATION,
  TRAIN_SALES_TEAM,
  UPDATE_SALES_MATERIALS,
  PREPARE_CUSTOMER_DEMO,
  REVIEW_WIN_LOSS_FEEDBACK,
  FIND_TARGET_COMPANIES,
  FIND_DECISION_MAKERS,
  RESEARCH_ACCOUNT,
  SCORE_AND_PRIORITIZE_LEADS,
  GENERATE_PERSONALIZED_OUTREACH,
  MONITOR_AND_CLASSIFY_RESPONSES,
  FOLLOW_UP_PROSPECTS,
  QUALIFY_LEADS,
  UPDATE_CRM,
  SCHEDULE_ONBOARDING,
  CONDUCT_QBR,
  MONITOR_HEALTH_SCORES,
  COLLECT_FEEDBACK,
  LAUNCH_UPSELL_CAMPAIGN,
  REVIEW_PRICING,
  TEST_NEW_PRICING,
  APPROVE_DISCOUNTS,
  UPDATE_COMMERCIAL_TERMS,
  MONITOR_COMPETITORS,
  CONDUCT_CUSTOMER_INTERVIEWS,
  UPDATE_MARKET_REPORT,
  TRACK_INDUSTRY_TRENDS,
  SCHEDULE_MONTHLY_REVIEW,
  REVIEW_KPIS,
  IDENTIFY_CONSTRAINTS,
  ASSIGN_PRIORITIES,
  APPROVE_ACTION_PLAN,
  SCORE_PRODUCT_MARKET_FIT,
  PRIORITIZE_FEATURES,
  VALIDATE_CUSTOMER_PROBLEM,
  SYNTHESIZE_CUSTOMER_FEEDBACK,
  APPROVE_VALIDATION_ROADMAP,
  BUILD_FINANCIAL_MODEL,
  UPDATE_BUDGET,
  RUN_SCENARIO_ANALYSIS,
  REVIEW_UNIT_ECONOMICS,
  APPROVE_FINANCIAL_PLAN,
]

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Check the whole Registry for internal coherence. Collects every problem rather
 * than throwing on the first, so one run tells you everything that is wrong.
 *
 * Exported for tests, which drive it over deliberately broken fixtures.
 */
export function validateRegistry(
  executives: readonly Executive[] = EXECUTIVES,
  programs: readonly ProgramTemplate[] = PROGRAMS,
  assets: readonly AssetDef[] = ASSETS,
  actions: readonly ActionDef[] = ACTIONS,
): string[] {
  const problems: string[] = []

  const duplicates = (kind: string, ids: string[]): void => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) problems.push(`Duplicate ${kind} id: ${id}`)
      seen.add(id)
    }
  }

  duplicates('executive', executives.map(e => e.id))
  duplicates('program', programs.map(p => p.id))
  duplicates('asset', assets.map(a => a.id))
  duplicates('action', actions.map(a => a.id))

  const programIds = new Set<string>(programs.map(p => p.id))
  const assetIds = new Set<string>(assets.map(a => a.id))
  const actionIds = new Set<string>(actions.map(a => a.id))
  const executiveIds = new Set<string>(executives.map(e => e.id))

  for (const executive of executives) {
    for (const programId of executive.programs) {
      if (!programIds.has(programId)) {
        problems.push(`Executive '${executive.id}' references unknown program '${programId}'`)
      }
    }
  }

  for (const program of programs) {
    if (!executiveIds.has(program.owner)) {
      problems.push(`Program '${program.id}' has unknown owner '${program.owner}'`)
    }
    for (const assetId of program.assets) {
      if (!assetIds.has(assetId)) {
        problems.push(`Program '${program.id}' references unknown asset '${assetId}'`)
        continue
      }
      // The link must hold BOTH ways. A Program listing an Asset that does not
      // name it back is how AS004-style sharing rots: seed P002 with AS004 in its
      // assets, forget to add `sharedWith: ['P002']` on AS004, and Story 2 then
      // blocks a legitimate P002 write while everything still looks correct.
      // Failing at load makes the Registry remember instead of a person.
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        const claims = [asset.program, ...(asset.sharedWith ?? [])]
        if (!claims.includes(program.id)) {
          problems.push(
            `Program '${program.id}' lists asset '${assetId}', but '${assetId}' does not name it ` +
              `as its owner or in sharedWith (it names ${claims.join(', ')})`,
          )
        }
      }
    }
    for (const actionId of program.actions) {
      if (!actionIds.has(actionId)) {
        problems.push(`Program '${program.id}' references unknown action '${actionId}'`)
        continue
      }
      // Phase 10 Part 2 — identical bidirectional check to the Asset one above: a Program
      // listing an Action that does not name it back as owner or sharedWith is how sharing
      // rots silently. Failing at load makes the Registry remember instead of a person.
      const action = actions.find(a => a.id === actionId)
      if (action) {
        const claims = [action.program, ...(action.sharedWith ?? [])]
        if (!claims.includes(program.id)) {
          problems.push(
            `Program '${program.id}' lists action '${actionId}', but '${actionId}' does not name it ` +
              `as its owner or in sharedWith (it names ${claims.join(', ')})`,
          )
        }
      }
      // Milestone 1 (AI SDR chaining): a dependsOn id must resolve AND must be listed in THIS
      // same Program — run.ts generates one Program's Actions at a time, so a cross-Program
      // dependency has no ordering guarantee and would silently never resolve at runtime.
      const dependsOn = actions.find(a => a.id === actionId)?.dependsOn
      if (dependsOn) {
        if (!actionIds.has(dependsOn)) {
          problems.push(`Action '${actionId}' depends on unknown action '${dependsOn}'`)
        } else if (!program.actions.includes(dependsOn)) {
          problems.push(
            `Action '${actionId}' depends on '${dependsOn}', but Program '${program.id}' does not ` +
              `list '${dependsOn}' among its own actions — dependsOn must stay within one Program`,
          )
        }
      }
    }
  }

  for (const asset of assets) {
    for (const programId of [asset.program, ...(asset.sharedWith ?? [])]) {
      if (!programIds.has(programId)) {
        problems.push(`Asset '${asset.id}' references unknown program '${programId}'`)
      }
    }
    // An Asset naming an owner that does not claim it back is a real
    // inconsistency: Story 2 validates writes against this relationship, so a
    // one-way link would let a Program write an Asset it does not maintain.
    // Only checked when the owner is actually seeded.
    if (programIds.has(asset.program)) {
      const owner = programs.find(p => p.id === asset.program)
      if (owner && !owner.assets.includes(asset.id)) {
        problems.push(
          `Asset '${asset.id}' claims owner '${asset.program}', but that program does not list it`,
        )
      }
    }
  }

  for (const action of actions) {
    // A connector means the Action reaches outside the product, which by
    // definition cannot be undone. Allowing connector + irreversible:false would
    // let something send with no approval at the Connector boundary (ADR-004).
    if (action.connector && !action.irreversible) {
      problems.push(
        `Action '${action.id}' has connector '${action.connector}' but is not marked irreversible — ` +
          `anything reaching an external system must require just-in-time approval (ADR-004)`,
      )
    }
    // Phase 10 Part 2 — identical to the Asset owner-claims-it-back check above.
    for (const programId of [action.program, ...(action.sharedWith ?? [])]) {
      if (!programIds.has(programId)) {
        problems.push(`Action '${action.id}' references unknown program '${programId}'`)
      }
    }
    if (programIds.has(action.program)) {
      const owner = programs.find(p => p.id === action.program)
      if (owner && !owner.actions.includes(action.id)) {
        problems.push(
          `Action '${action.id}' claims owner '${action.program}', but that program does not list it`,
        )
      }
    }
  }

  return problems
}

/**
 * Fail fast at import time.
 *
 * F05's edge case: "a Program referencing a missing Asset → fail at load with a
 * clear message, not at runtime". A typo in a Registry entry should stop the
 * process on boot — loudly, once, for everyone — rather than surface months later
 * as an unexplained null in one founder's weekly cycle.
 */
const problems = validateRegistry()
if (problems.length > 0) {
  throw new RegistryValidationError(problems)
}

// ─── Lookups ──────────────────────────────────────────────────────────────────
// Unknown ids throw. They never return undefined (F05 US-05.2) — a silent
// undefined is how a bad reference reaches an LLM call and produces confident
// nonsense instead of an error.

export function getExecutive(id: ExecutiveId | string): Executive {
  const executive = EXECUTIVES.find(e => e.id === id)
  if (!executive) throw new ExecutiveNotFoundError(id)
  return executive
}

export function getProgram(id: ProgramId | string): ProgramTemplate {
  const program = PROGRAMS.find(p => p.id === id)
  if (!program) throw new ProgramNotFoundError(id)
  return program
}

export function getAsset(id: AssetId | string): AssetDef {
  const asset = ASSETS.find(a => a.id === id)
  if (!asset) throw new AssetNotFoundError(id)
  return asset
}

export function getAction(id: ActionId | string): ActionDef {
  const action = ACTIONS.find(a => a.id === id)
  if (!action) throw new ActionNotFoundError(id)
  return action
}

// ─── Listings ─────────────────────────────────────────────────────────────────
// Copies, not the live arrays — the Registry is read-only at runtime.

export function listExecutives(): Executive[] {
  return [...EXECUTIVES]
}

export function listPrograms(): ProgramTemplate[] {
  return [...PROGRAMS]
}

/** Programs owned by an Executive. Throws if the Executive is unknown. */
export function listProgramsForExecutive(id: ExecutiveId | string): ProgramTemplate[] {
  return getExecutive(id).programs.map(getProgram)
}

/**
 * Programs that may maintain an Asset — its owner plus any `sharedWith`.
 *
 * Story 2 (F11) should validate writes against THIS, not against `asset.program`
 * alone: AS004 is owned by P001 but legitimately maintained by P002 too, and an
 * owner-only check would block real work while looking correct.
 */
export function listProgramsForAsset(id: AssetId | string): ProgramId[] {
  const asset = getAsset(id)
  return [asset.program, ...(asset.sharedWith ?? [])]
}

/** Programs that may generate an Action — its owner plus any `sharedWith`. Mirrors listProgramsForAsset. */
export function listProgramsForAction(id: ActionId | string): ProgramId[] {
  const action = getAction(id)
  return [action.program, ...(action.sharedWith ?? [])]
}
