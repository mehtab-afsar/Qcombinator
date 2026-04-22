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
})

export type SignupInput = z.infer<typeof signupSchema>

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
  weight_market:    weightField,
  weight_product:   weightField,
  weight_gtm:       weightField,
  weight_financial: weightField,
  weight_team:      weightField,
  weight_traction:  weightField,
})

export type WeightsInput = z.infer<typeof weightsSchema>
