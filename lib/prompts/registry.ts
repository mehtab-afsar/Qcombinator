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
// No knowledge/ceo.ts barrel — it held no content of its own (just re-exported these
// two), so the two are imported directly from where they actually live.
import { S001_STRATEGY_SESSION } from './executives/ceo/s001'
import { S002_EXECUTIVE_CONTRACT } from './executives/ceo/s002'
import { P001_GTM_PROMPT } from './executives/growth/programs/p001'
import { AS001_ICP_PROFILES_PROMPT } from './executives/growth/assets/as001'
import { AS002_PAINS_GAINS_PROMPT } from './executives/growth/assets/as002'
import { AS003_BUYER_JOURNEY_PROMPT } from './executives/growth/assets/as003'
import { AS004_POSITIONING_PROMPT } from './executives/growth/assets/as004'
import { AS005_CHANNEL_STRATEGY_PROMPT } from './executives/growth/assets/as005'
import { VALIDATE_ICPS_PROMPT } from './executives/growth/actions/validate-icps'
import { INTERVIEW_CUSTOMERS_PROMPT } from './executives/growth/actions/interview-customers'
import { POST_TEAM_UPDATE_PROMPT } from './executives/growth/actions/post-team-update'
import { PRIORITIZE_CHANNELS_PROMPT } from './executives/growth/actions/prioritize-channels'
import { REVIEW_MESSAGING_PROMPT } from './executives/growth/actions/review-messaging'
import { APPROVE_GTM_PLAN_PROMPT } from './executives/growth/actions/approve-gtm-plan'

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
 * S004–S006 are absent, and that is not a gap. The "P001 with S004 is invalid"
 * rule (PRD §7.2) is a Registry relationship check — `P001.owner === 'growth'` —
 * which fails before any text is fetched. Composition is blocked by ownership,
 * not by a missing prompt.
 */
const EXECUTIVE_PROMPTS: Readonly<Record<string, string>> = {
  S001: S001_STRATEGY_SESSION,
  S002: S002_EXECUTIVE_CONTRACT,
  S003: S003_GROWTH,
}

/** Program Prompts, by `ProgramTemplate.programPromptRef`. */
const PROGRAM_PROMPTS: Readonly<Record<string, string>> = {
  P001: P001_GTM_PROMPT,
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
 * regardless (ADR-010).
 */
const INSTRUCTION_PROMPTS: Readonly<Record<string, string>> = {
  AS001: AS001_ICP_PROFILES_PROMPT,
  AS002: AS002_PAINS_GAINS_PROMPT,
  AS003: AS003_BUYER_JOURNEY_PROMPT,
  AS004: AS004_POSITIONING_PROMPT,
  AS005: AS005_CHANNEL_STRATEGY_PROMPT,
  validate_icps: VALIDATE_ICPS_PROMPT,
  interview_customers: INTERVIEW_CUSTOMERS_PROMPT,
  prioritize_channels: PRIORITIZE_CHANNELS_PROMPT,
  review_messaging: REVIEW_MESSAGING_PROMPT,
  approve_gtm_plan: APPROVE_GTM_PLAN_PROMPT,
  post_team_update: POST_TEAM_UPDATE_PROMPT,
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
