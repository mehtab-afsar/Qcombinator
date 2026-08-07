import { z } from 'zod'
import type { NextRequest } from 'next/server'

export type ParseResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string }

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<ParseResult<z.infer<T>>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { ok: false, error: 'Invalid or missing JSON body' }
  }
  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path  = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return { ok: false, error: `${path}${issue.message}` }
  }
  return { ok: true, data: result.data }
}

// ─── Reusable field schemas ───────────────────────────────────────────────

export const uuidSchema  = z.string().uuid()
export const emailSchema = z.string().email().max(320)

// ─── Auth / signup ────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email:            emailSchema,
  password:         z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName:         z.string().min(1, 'Full name is required').max(120),
  startupName:      z.string().max(120).optional(),
  companyName:      z.string().max(120).optional(),
  website:          z.string().max(2083).optional(),
  industry:         z.string().max(80).optional(),
  stage:            z.string().max(40).optional(),
  revenueStatus:    z.string().max(40).optional(),
  fundingStatus:    z.string().max(40).optional(),
  teamSize:         z.string().max(20).optional(),
  founderName:      z.string().max(120).optional(),
  problemStatement: z.string().max(1000).optional(),
  targetCustomer:   z.string().max(300).optional(),
  location:         z.string().max(100).optional(),
  tagline:          z.string().max(140).optional(),
  marketSizeEstimate: z.string().max(500).optional(),  // TAM/addressable market estimate
  gtmStrategy:      z.string().max(300).optional(),    // Go-to-market strategy
  founderBackground: z.array(z.string()).optional(),   // Array of background tags
  teamToken:        z.string().max(128).optional(),    // team invite token — auto-joins workspace on signup
})

export type SignupInput = z.infer<typeof signupSchema>

/**
 * Steps 2–5 only — no email/password/fullName. A Google sign-up already has an authenticated
 * session and a founder_profiles stub (name + email from Google, /auth/callback), so completing
 * onboarding is filling in the company, not creating an account.
 */
export const completeProfileSchema = z.object({
  startupName:      z.string().max(120).optional(),
  companyName:      z.string().max(120).optional(),
  website:          z.string().max(2083).optional(),
  industry:         z.string().max(80).optional(),
  stage:            z.string().max(40).optional(),
  revenueStatus:    z.string().max(40).optional(),
  fundingStatus:    z.string().max(40).optional(),
  teamSize:         z.string().max(20).optional(),
  problemStatement: z.string().max(1000).optional(),
  targetCustomer:   z.string().max(300).optional(),
  location:         z.string().max(100).optional(),
  tagline:          z.string().max(140).optional(),
  marketSizeEstimate: z.string().max(500).optional(),
  gtmStrategy:      z.string().max(300).optional(),
  founderBackground: z.array(z.string()).optional(),
})

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>

// ─── Founder profile ──────────────────────────────────────────────────────

export const founderProfilePatchSchema = z.object({
  fullName:         z.string().min(1).max(120).optional(),
  startupName:      z.string().max(120).optional(),
  industry:         z.string().max(80).optional(),
  description:      z.string().max(2000).optional(),
  stage:            z.string().max(40).optional(),
  funding:          z.string().max(40).optional(),
  website:          z.string().max(2083).optional(),
  tagline:          z.string().max(140).optional(),
  location:         z.string().max(100).optional(),
  problemStatement: z.string().max(1000).optional(),
  targetCustomer:   z.string().max(300).optional(),
})

export type FounderProfilePatch = z.infer<typeof founderProfilePatchSchema>

// ─── Notifications ────────────────────────────────────────────────────────

export const markReadSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one notification ID is required'),
})

export type MarkReadInput = z.infer<typeof markReadSchema>

// ─── Investor signup ──────────────────────────────────────────────────────

export const investorSignupSchema = z.object({
  email:    emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export type InvestorSignupInput = z.infer<typeof investorSignupSchema>

// ─── Investor onboarding ──────────────────────────────────────────────────

export const investorOnboardingSchema = z.object({
  firstName:       z.string().max(80).optional(),
  lastName:        z.string().max(80).optional(),
  email:           emailSchema.optional(),
  phone:           z.string().max(30).optional(),
  linkedin:        z.string().max(300).optional(),
  firmName:        z.string().max(120).optional(),
  firmType:        z.string().max(60).optional(),
  firmSize:        z.string().max(40).optional(),
  aum:             z.string().max(40).optional(),
  website:         z.string().max(2083).optional(),
  location:        z.string().max(100).optional(),
  checkSize:       z.array(z.string()).optional(),
  stages:          z.array(z.string()).optional(),
  sectors:         z.array(z.string()).optional(),
  geography:       z.array(z.string()).optional(),
  thesis:          z.string().max(2000).optional(),
  dealFlow:        z.string().max(500).optional(),
  decisionProcess: z.string().max(500).optional(),
  timeline:        z.string().max(80).optional(),
})

export type InvestorOnboardingInput = z.infer<typeof investorOnboardingSchema>

// ─── Investor pipeline ────────────────────────────────────────────────────

const PIPELINE_STAGES = ['watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed'] as const

export const pipelinePostSchema = z.object({
  founderId: uuidSchema,
  stage:     z.enum(PIPELINE_STAGES).default('watching'),
  notes:     z.string().max(2000).optional(),
})

export const pipelinePatchSchema = z.object({
  founderId: uuidSchema,
  stage:     z.enum(PIPELINE_STAGES).optional(),
  notes:     z.string().max(2000).optional(),
})

export type PipelinePostInput  = z.infer<typeof pipelinePostSchema>
export type PipelinePatchInput = z.infer<typeof pipelinePatchSchema>

// ─── Investor weights ─────────────────────────────────────────────────────

const weightField = z.number().min(0).max(100)

export const weightsSchema = z.object({
  weight_p1: weightField,
  weight_p2: weightField,
  weight_p3: weightField,
  weight_p4: weightField,
  weight_p5: weightField,
  weight_p6: weightField,
})

export type WeightsInput = z.infer<typeof weightsSchema>

// ─── Investor connections (Phase 0-I / H-3) ───────────────────────────────

export const connectionsPatchSchema = z.object({
  requestId: uuidSchema,
  action:    z.enum(['accept', 'decline']),
  feedback:  z.object({
    reasons: z.array(z.string().max(200)).max(20).optional(),
    text:    z.string().max(2000).optional(),
  }).optional(),
})

export type ConnectionsPatchInput = z.infer<typeof connectionsPatchSchema>

// ─── Match rationale (founder-facing "why this match") ────────────────────
// investorId/demoInvestorId mirror connection_requests' real/demo split — exactly one is
// required, matching the DB CHECK on founder_match_explanations.

export const matchRationaleSchema = z.object({
  investorId:        uuidSchema.optional(),
  demoInvestorId:    uuidSchema.optional(),
  investorName:      z.string().min(1).max(200),
  investorFirm:      z.string().max(200).optional().default(''),
  investorThesis:    z.string().max(2000).optional().default(''),
  investorSectors:   z.array(z.string().max(100)).max(20).default([]),
  investorStages:    z.array(z.string().max(100)).max(20).default([]),
  investorPortfolio: z.array(z.string().max(200)).max(20).default([]),
  matchScore:        z.number().min(0).max(100),
  founderSector:     z.string().max(100),
  founderStage:      z.string().max(100),
  founderQScore:     z.number().min(0).max(100),
  startupOneLiner:   z.string().max(500).optional(),
  regenerate:        z.boolean().optional(),
}).refine(d => Boolean(d.investorId) !== Boolean(d.demoInvestorId), {
  message: 'Exactly one of investorId or demoInvestorId is required',
})

export type MatchRationaleInput = z.infer<typeof matchRationaleSchema>

// ─── Investor watchlist (Phase 0-I / H-3) ─────────────────────────────────

export const watchlistPostSchema = z.object({
  founderId:       uuidSchema,
  thresholdQscore: z.number().min(0).max(100).optional(),
})

export const watchlistDeleteSchema = z.object({
  founderId: uuidSchema,
})

export type WatchlistPostInput   = z.infer<typeof watchlistPostSchema>
export type WatchlistDeleteInput = z.infer<typeof watchlistDeleteSchema>

// ─── Investor AI chat routes (Phase 0-I / H-3) ────────────────────────────
// Free text feeding an LLM prompt — the max-length bound is the actual fix
// (unbounded token-cost / prompt-injection surface), Zod is the mechanism.

export const aiAnalysisChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(50).optional(),
})

export const startupChatSchema = z.object({
  question: z.string().min(1).max(1000),
})

// CANVAS_SPEC §4.6's chat rail — a command/question LINE, not a research query, hence the
// shorter cap than startupChatSchema's 1000.
export const executiveChatSchema = z.object({
  message: z.string().trim().min(1).max(500),
})

export type AiAnalysisChatInput = z.infer<typeof aiAnalysisChatSchema>
export type StartupChatInput    = z.infer<typeof startupChatSchema>
export type ExecutiveChatInput  = z.infer<typeof executiveChatSchema>

// ─── Investor config (Phase 0-I / H-3) ────────────────────────────────────

const dealFiltersSchema = z.object({
  stages:       z.array(z.enum(['idea', 'mvp', 'pre-seed', 'seed', 'series-a'])),
  sectors:      z.array(z.string().max(80)),
  geographies:  z.array(z.string().max(80)),
  minQScore:    z.number().min(0).max(100),
  maxValuation: z.number().min(0),
  minAUM:       z.number().min(0),
})

const matchingWeightsSchema = z.object({
  qscore:           z.number().min(0).max(100),
  marketReadiness:  z.number().min(0).max(100),
  marketPotential:  z.number().min(0).max(100),
  ipDefensibility:  z.number().min(0).max(100),
  founderTeam:      z.number().min(0).max(100),
  structuralImpact: z.number().min(0).max(100),
  financials:       z.number().min(0).max(100),
  customScore:      z.number().min(0).max(100),
})

const pipelineStageSchema = z.object({
  id:          z.string().max(60),
  label:       z.string().max(80),
  description: z.string().max(300),
  order:       z.number(),
})

const investorPreferencesSchema = z.object({
  dealFilters:             dealFiltersSchema,
  matchingWeights:         matchingWeightsSchema,
  dashboardKPIs:           z.array(z.enum(['portfolio-value', 'deal-pipeline', 'returns', 'activity'])),
  pipelineStages:          z.array(pipelineStageSchema),
  notificationFrequency:   z.enum(['realtime', 'daily', 'weekly', 'monthly']),
  emailDigestEnabled:      z.boolean(),
  slackIntegrationEnabled: z.boolean(),
})

export const investorConfigSchema = z.object({
  investorType: z.enum(['angel', 'seed-vc', 'growth-vc', 'corporate']),
  preferences:  investorPreferencesSchema,
})

export type InvestorConfigInput = z.infer<typeof investorConfigSchema>

// ─── Investor portfolio display config (Phase 0-I / H-3) ─────────────────

export const portfolioConfigPatchSchema = z.object({
  showMRR:    z.boolean().optional(),
  showRunway: z.boolean().optional(),
  showBurn:   z.boolean().optional(),
  showGrowth: z.boolean().optional(),
  showQScore: z.boolean().optional(),
  showHealth: z.boolean().optional(),
})

export type PortfolioConfigPatchInput = z.infer<typeof portfolioConfigPatchSchema>

// ─── Investor outreach (Phase 0-I / H-3) ──────────────────────────────────

export const outreachPostSchema = z.object({
  founderId: uuidSchema,
  message:   z.string().min(1).max(2000),
})

export type OutreachPostInput = z.infer<typeof outreachPostSchema>

// ─── Investor portfolio companies (Phase 0-I / H-3) ───────────────────────

const portfolioCompanyFieldsSchema = {
  company_name:    z.string().min(1).max(200),
  founder_name:    z.string().max(200).optional(),
  founder_email:   emailSchema.optional(),
  sector:          z.string().max(80).optional(),
  stage:           z.string().max(40).optional(),
  invested_at:     z.string().max(40).optional(),
  investment_note: z.string().max(2000).optional(),
}

export const portfolioCompanyPostSchema = z.object(portfolioCompanyFieldsSchema)

export const portfolioCompanyPatchSchema = z.object({
  company_name:    portfolioCompanyFieldsSchema.company_name.optional(),
  founder_name:    portfolioCompanyFieldsSchema.founder_name,
  founder_email:   portfolioCompanyFieldsSchema.founder_email,
  sector:          portfolioCompanyFieldsSchema.sector,
  stage:           portfolioCompanyFieldsSchema.stage,
  invested_at:     portfolioCompanyFieldsSchema.invested_at,
  investment_note: portfolioCompanyFieldsSchema.investment_note,
})

export const portfolioCompanyInviteSchema = z.object({
  companyId: uuidSchema,
})

export const portfolioCompanyImportSchema = z.object({
  rows: z.array(z.object({
    company_name:    z.string().max(200).optional(),
    founder_name:    z.string().max(200).optional(),
    founder_email:   z.string().max(320).optional(),
    sector:          z.string().max(80).optional(),
    stage:           z.string().max(40).optional(),
    invested_at:     z.string().max(40).optional(),
    investment_note: z.string().max(2000).optional(),
  })).min(1, 'rows must be a non-empty array').max(200, 'Maximum 200 companies per import'),
})

export type PortfolioCompanyPostInput   = z.infer<typeof portfolioCompanyPostSchema>
export type PortfolioCompanyPatchInput  = z.infer<typeof portfolioCompanyPatchSchema>
export type PortfolioCompanyInviteInput = z.infer<typeof portfolioCompanyInviteSchema>
export type PortfolioCompanyImportInput = z.infer<typeof portfolioCompanyImportSchema>

// ─── Investor startup deep-dive: memo + share (Phase 0-I / H-3) ──────────

export const startupMemoSchema = z.object({
  startup:    z.record(z.string(), z.unknown()),
  regenerate: z.boolean().optional(),
})

export const startupShareSchema = z.object({
  targetInvestorId: uuidSchema,
  note:             z.string().max(500).optional(),
})

export type StartupMemoInput  = z.infer<typeof startupMemoSchema>
export type StartupShareInput = z.infer<typeof startupShareSchema>
