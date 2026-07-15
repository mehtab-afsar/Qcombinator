/**
 * The Prompt Composer — types.
 *
 * Product 1 (PRD §7.2). Separates prompt *content* from prompt *execution*: the
 * same assembly logic for every Executive and Program, in a fixed deterministic
 * order, validated before anything reaches a model.
 *
 * Why this exists: the old model reasons from accumulated chat history, which
 * "drifts, contradicts itself and goes stale" (PRD §2). The Composer reasons from
 * today's Registry + today's Assets, assembled identically every time.
 */

import type { ActionId, AssetId, ExecutiveId, ProgramId } from '@/lib/registry'

/** The fixed 4-layer nomenclature (ADR-012). Never invent competing terms. */
export type PromptLayerName =
  | 'executive_system_prompt'
  | 'program_prompt'
  | 'asset_action_instructions'
  | 'company_context'

/**
 * One assembled layer, with its provenance.
 *
 * PRD §7.2 requires the Composer to "preserve source references for every
 * component" — so a package can always be traced back to the entries that
 * produced it, rather than being an anonymous wall of text.
 */
export interface PromptLayer {
  name: PromptLayerName
  /** 1 = highest authority. Lower layers never override higher ones. */
  rank: 1 | 2 | 3 | 4
  /** Where this came from: 'S003', 'P001', 'AS001', or 'company_context'. */
  sourceRef: string
  text: string
}

/**
 * The founder's company facts — layer 4.
 *
 * ⚠️ THIS IS DATA, NOT INSTRUCTIONS (CLAUDE.md §3). Everything here is founder-
 * supplied or founder-derived, so it is fenced inside a data envelope by the
 * Composer. A Strategy that reads "ignore your previous instructions" must arrive
 * as a fact *about the founder*, never as a command.
 *
 * Passed IN by the caller. The Composer performs no I/O: the Strategy and
 * Contract tables (F07/F08) and Asset versions (F11) do not exist yet, and the
 * Composer must not wait for them. It also keeps this a pure function.
 */
export interface CompanyContext {
  companyName?: string
  /** S001 — the founder's direction. */
  strategy?: string
  /** S002 — the mandate. */
  contract?: string
  /** The separate diagnostic (ADR-005). Read-only here; composing never moves it. */
  qScore?: { overall: number; summary?: string }
  /**
   * Current Asset versions — the company's memory. From F11 once it exists.
   * Keyed by AssetId so the Composer can exclude irrelevant Assets (PRD §7.2).
   */
  currentAssets?: Partial<Record<AssetId, string>>
  /** Anything new this cycle — uploads, notes, results. */
  newInformation?: string
}

export interface ComposeInput {
  /** Who is executing. Must own the Program — this is the S004 rule. */
  executiveId: ExecutiveId
  programId: ProgramId
  /** What is being produced. Exactly one of these, never both. */
  assetId?: AssetId
  actionId?: ActionId
  context: CompanyContext
  /**
   * The Contract's active Programs. When supplied, the Program must be among
   * them — "the prompt requests no capability outside the Executive Contract"
   * (PRD §7.2). Omitted until F08 exists; supplying it enables the check.
   */
  activePrograms?: ProgramId[]
  /** Correlates a failure with the run that caused it. Generated when absent. */
  executionId?: string
}

/** One structured execution package (PRD §7.2). */
export interface ExecutionPackage {
  executionId: string
  executiveId: ExecutiveId
  programId: ProgramId
  assetId?: AssetId
  actionId?: ActionId
  /** Always ordered by rank: 1 → 2 → 3 → 4. */
  layers: PromptLayer[]
  /** The layers joined in order — what actually goes to the model. */
  text: string
  composedAt: string
}

/**
 * Every validation rule the Composer enforces before release (PRD §7.2).
 * Named so a failure says which rule broke, not just "invalid".
 */
export type FailedRule =
  | 'executive_does_not_own_program'
  | 'asset_not_in_program'
  | 'action_not_in_program'
  | 'asset_and_action_both_requested'
  | 'no_asset_or_action_requested'
  | 'program_not_in_contract'
  | 'prompt_ref_not_found'

/**
 * Invalid → block execution + a runtime error identifying the executionId, the
 * failed rule, the missing/conflicting component, the affected entity and a
 * timestamp. Shape is PRD §7.2 / Featureinventory F06.5, verbatim.
 *
 * Blocking is the point. A package that requests a capability outside the
 * mandate, or pairs a Program with the wrong Executive, must never reach a model
 * — a wrong prompt does not error, it produces confident nonsense.
 */
export class PromptValidationError extends Error {
  readonly executionId: string
  readonly failedRule: FailedRule
  readonly conflictingComponent: string
  readonly affectedEntity: string
  readonly timestamp: string

  constructor(details: {
    executionId: string
    failedRule: FailedRule
    conflictingComponent: string
    affectedEntity: string
    message: string
  }) {
    super(details.message)
    this.name = 'PromptValidationError'
    this.executionId = details.executionId
    this.failedRule = details.failedRule
    this.conflictingComponent = details.conflictingComponent
    this.affectedEntity = details.affectedEntity
    this.timestamp = new Date().toISOString()
  }
}
