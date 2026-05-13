/**
 * Zod schemas for JSONB columns whose shape is not enforced by the DB.
 *
 * Use at write sites to catch shape drift before corrupt data reaches the column.
 * Parse is deliberately lenient (all fields optional, unknown keys stripped) so
 * older rows and partial updates don't fail at runtime.
 */
import { z } from 'zod'

// ─── founder_profiles.startup_profile_data ────────────────────────────────────

export const startupProfileDataSchema = z.object({
  // Core pitch fields (set at signup and via profile PATCH)
  problemStatement:        z.string().max(2000).optional(),
  targetCustomer:          z.string().max(500).optional(),
  // LLM-cleaned versions written asynchronously after signup
  problemStatementCleaned: z.string().max(2400).optional(),
  targetCustomerCleaned:   z.string().max(600).optional(),
  problemSummary:          z.string().max(300).optional(),
  // Extended profile-builder fields
  companyName:      z.string().max(120).optional(),
  website:          z.string().max(2083).optional(),
  incorporation:    z.string().max(100).optional(),
  foundedDate:      z.string().max(50).optional(),
  industry:         z.string().max(80).optional(),
  oneLiner:         z.string().max(300).optional(),
  stage:            z.string().max(40).optional(),
  whyNow:           z.string().max(2000).optional(),
  solution:         z.string().max(2000).optional(),
  uniquePosition:   z.string().max(2000).optional(),
  moat:             z.string().max(2000).optional(),
  tamSize:          z.string().max(200).optional(),
  marketGrowth:     z.string().max(500).optional(),
  customerPersona:  z.string().max(2000).optional(),
  businessModel:    z.string().max(2000).optional(),
  competitors:      z.array(z.string()).optional(),
  differentiation:  z.string().max(2000).optional(),
  tractionType:     z.string().max(200).optional(),
  // Traction / financial fields
  mrr:              z.string().max(50).optional(),
  arr:              z.string().max(50).optional(),
  growthRate:       z.string().max(50).optional(),
  customerCount:    z.string().max(50).optional(),
  churnRate:        z.string().max(50).optional(),
  cac:              z.string().max(50).optional(),
  ltv:              z.string().max(50).optional(),
  userInterviews:   z.string().max(2000).optional(),
  lois:             z.string().max(2000).optional(),
  pilots:           z.string().max(2000).optional(),
  waitlist:         z.string().max(500).optional(),
  // Team / fundraising
  teamSize:         z.string().max(20).optional(),
  advisors:         z.array(z.string()).optional(),
  equitySplit:      z.string().max(200).optional(),
  keyHires:         z.array(z.string()).optional(),
  raisingAmount:    z.string().max(100).optional(),
  useOfFunds:       z.string().max(2000).optional(),
  previousFunding:  z.string().max(500).optional(),
  runwayRemaining:  z.string().max(50).optional(),
  targetCloseDate:  z.string().max(50).optional(),
}).passthrough()  // allow keys added by future profile-builder sections without breaking old code

export type StartupProfileData = z.infer<typeof startupProfileDataSchema>

// ─── qscore_history.ai_actions ────────────────────────────────────────────────

const aiActionItemSchema = z.object({
  title:         z.string().max(200),
  description:   z.string().max(1000),
  dimension:     z.string(),
  impact:        z.string().max(50),
  agentId:       z.string(),
  agentName:     z.string(),
  timeframe:     z.string().max(50),
  starterPrompt: z.string().max(1000).optional(),
}).passthrough()

const unlockCardSchema = z.object({
  indicatorId:        z.string(),
  indicatorName:      z.string(),
  parameterId:        z.string(),
  currentScore:       z.number(),
  targetScore:        z.number(),
  estimatedPointGain: z.number(),
  action:             z.string(),
  agentId:            z.string().optional(),
}).passthrough()

const ragEvalSchema = z.object({
  scoringMethod:   z.string(),
  ragConfidence:   z.number().min(0).max(1),
  evidenceSummary: z.array(z.string()).optional(),
  conflicts:       z.array(z.object({
    dimension:  z.string().optional(),
    current:    z.string().optional(),
    submitted:  z.string().optional(),
    resolution: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough()

const dailyPriorityItemSchema = z.object({
  title:   z.string().max(200),
  why:     z.string().max(500),
  action:  z.string().max(500),
  agentId: z.string().optional(),
  urgency: z.enum(['high', 'medium', 'low']),
}).passthrough()

const bluffFlagSchema = z.object({
  description: z.string(),
  detected_at: z.string(),
}).passthrough()

export const aiActionsSchema = z.object({
  actions:          z.array(aiActionItemSchema).max(10).optional(),
  unlockCards:      z.array(unlockCardSchema).optional(),
  readinessSummary: z.string().max(2000).optional(),
  rag_eval:         ragEvalSchema.optional(),
  daily_priority: z.object({
    priorities:  z.array(dailyPriorityItemSchema),
    generatedAt: z.string(),
  }).passthrough().optional(),
  bluff_flags: z.array(bluffFlagSchema).optional(),
}).passthrough()

export type AiActions = z.infer<typeof aiActionsSchema>
