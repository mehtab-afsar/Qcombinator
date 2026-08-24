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
  /**
   * Today's date, supplied by the CALLER (the Composer stays pure). Rendered so the model
   * dates documents truthfully — trial run 4 invented "May 2024/2025" across assets.
   */
  currentDate?: string
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
  /**
   * AI SDR Milestone 1 — real chaining. When an Action declares `ActionDef.dependsOn`, this
   * carries the depended-on Action's own result, populated by `lib/rhythm/run.ts`'s Actions
   * phase (never by the Composer itself — this stays a pure function, same discipline as
   * `currentAssets`). Distinct from `currentAssets`: this is one prior ACTION's output within
   * this same chain, not a Program's maintained documents.
   */
  dependencyResult?: { actionId: ActionId; label: string; text: string }
  /**
   * Anonymized, aggregate stats from founders in a similar sector/stage bucket on this
   * platform (lib/comparables/retrieve.ts). Never per-founder data — a single real founder's
   * identity or exact figure must never reach this field. Market context about *other*
   * companies, not this founder's own data; still fenced as data, not instructions, like
   * everything else in this layer.
   */
  comparableCohort?: string
  /**
   * Recent, sector-matched startup funding news from a third-party source (TechCrunch RSS —
   * lib/comparables/market-signals.ts). Unlike comparableCohort, this is real, already-public
   * company names and figures, not anonymized platform data — but it is UNVERIFIED news, not
   * a fact this product vouches for, and the rendered text says so explicitly. Same as
   * qScore/comparableCohort: composing never moves the Q-Score, and never will from this field.
   */
  marketSignals?: string
  /**
   * A founder's own real prospect list — name/email/company/title, one line each. Populated
   * NARROWLY: only for Actions whose `connector === 'gmail'` (see `lib/rhythm/run.ts`'s
   * `founderContactsContextFor`), never merged into the shared context every Asset/Briefing/
   * Action across every Program sees. That narrowness is deliberate — this is real PII, and a
   * founder's contact reaching, say, a persisted Asset document with no link back to the
   * source row would be a second, silent copy of their data with no way to know it needs
   * cleanup when the contact is later deleted.
   */
  founderContacts?: string
  /**
   * The founder's OWN verified revenue, read from the Stripe figures their connected account
   * already synced onto `founder_profiles` (`lib/connectors/context.ts`; ADR-038).
   *
   * The trust level is the point, and it is the opposite of `marketSignals`: that field is
   * explicitly unverified third-party news, this is first-party payment data the founder
   * connected themselves. The rendered text says so, so the model weights it above any
   * self-reported figure elsewhere in the context.
   *
   * A DB read, not a connector call — nothing here contacts Stripe, so a cycle using it makes no
   * external call and spends nothing. And like `qScore`, it is strictly read-only: composing
   * never moves the score, and revenue landing here never will either (ADR-005).
   */
  stripeMetrics?: string
  /**
   * The founder's current lead pipeline, read back from `founder_leads`
   * (`lib/entities/leads.ts`'s `getLeadsContext`). Populated NARROWLY, by
   * `lib/rhythm/run.ts`'s `leadsContextFor`: only for Actions of a Program that declares a
   * lead-producing Action, never for an Asset or a Briefing — the same carve-out, and the same
   * reason, as `founderContacts` above.
   *
   * ⚠️ CARRIES NO EMAIL ADDRESSES, only whether one is on file. Recipients come from
   * `founderContacts`, the founder-vouched path; a pipeline is for reasoning about who to work
   * next, and every prompt it reaches is a place an address could come to rest.
   *
   * This is what makes chained Actions read the live table instead of the previous step's
   * already-stale prose summary (`dependencyResult`, which remains for genuinely narrative
   * handoffs).
   */
  pipelineLeads?: string
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
