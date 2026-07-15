/**
 * The Registry — types.
 *
 * The **authoritative runtime source** for Executives, Programs, Assets and
 * Actions (ADR-010). The Excel workbook at `docs/registry-source/` is the design
 * and seeding source only — nothing reads it at runtime.
 *
 * Adding a capability = adding a Registry entry. Never a route, never a persona
 * (CLAUDE.md §0.1). This is what replaces the 11-persona / ~170-route sprawl.
 *
 * **Generic from day one** (ADR-011): these types describe the full Registry of
 * Executives/Programs/Assets/Actions. P001 GTM is simply the first entry proven
 * end to end — it is not a special case, and nothing here is GTM-shaped.
 *
 * Shapes follow EDGE_ALPHA_PRD.md §7.1. Where this file departs from §7.1 it
 * says so, in place, with the reason.
 */

// ─── Identifiers ──────────────────────────────────────────────────────────────
//
// ExecutiveId is a closed union — PRD §7.1 verbatim, and the roster is fixed at
// five. The others stay open template-literal types on purpose: a closed union of
// 29 Programs and 41 Assets would need hand-editing every time an entry is added,
// which is the opposite of "config over code".
//
// Referential safety does not come from the type system here; it comes from
// validateRegistry(), which fails at LOAD with a message naming the bad
// reference. That is F05's stated requirement — fail at load, not at runtime.

export type ExecutiveId = 'ceo' | 'growth' | 'product' | 'operations' | 'finance'

/** e.g. 'P001' */
export type ProgramId = `P${string}`

/** e.g. 'AS001' */
export type AssetId = `AS${string}`

/** e.g. 'interview_customers' — snake_case; the workbook defines no ID convention */
export type ActionId = string

/** Widened as adapters land in Story 3. Gmail is the first (PRD §10). */
export type ConnectorId = 'gmail'

// ─── Definitions ──────────────────────────────────────────────────────────────

export interface Executive {
  id: ExecutiveId
  name: string
  motto: string
  domains: string[]
  /** Programs this Executive owns. Every id must resolve — enforced at load. */
  programs: ProgramId[]
  /** The Executive System Prompt — layer 1 of the Composer (ADR-012). e.g. 'S003' */
  systemPromptRef: string
  /** Old-model agent ids folded in as specialists, called via lib/agents/delegation.ts */
  inheritsFrom: string[]
}

export interface ProgramTemplate {
  id: ProgramId
  /** Short handle, e.g. 'GTM' */
  handle: string
  name: string
  owner: ExecutiveId
  objective: string
  /**
   * For judgement and reporting only (PRD §14). It does NOT move the Q-Score —
   * that is a separate diagnostic (ADR-005) — and it does not gate execution.
   */
  successMetric: string
  /** Assets this Program maintains. Every id must resolve — enforced at load. */
  assets: AssetId[]
  /** Actions this Program can generate. Every id must resolve — enforced at load. */
  actions: ActionId[]
  /** The Program Prompt — layer 2 of the Composer (ADR-012). e.g. 'P001' */
  programPromptRef: string
}

// NOTE — there is deliberately NO `runsWhen` field, and there must never be one.
// ADR-008: the Operating Rhythm runs ALL contract-active Programs every cycle;
// the Contract decides what is active, not the Program.
//
// The seed workbook's P001 prompt contains an "Autonomous Activation — execute
// this Program whenever..." section. That is prose for the Composer to reason
// with, and it is fine there. It must not become a field here. Event-aware
// skipping is a deferred cost optimisation, not v1 behaviour.
// __tests__/registry.test.ts asserts this.

export interface AssetDef {
  id: AssetId
  name: string
  /**
   * The OWNING Program (PRD §7.1). Story 2's persistence validation reads this
   * to block "a P003 output stored as a version of AS001" (PRD §7.3).
   */
  program: ProgramId
  /**
   * Programs that also legitimately maintain this Asset.
   *
   * DEPARTS FROM PRD §7.1, deliberately. §7.1 models the relationship as a single
   * `program`, but the workbook's Asset Registry gives AS004 as
   * "P001 - GTM, P002 - Brand" — one Asset, two Programs. With owner-only, Story 2
   * would correctly block a P003 write to AS001 and *incorrectly* block a
   * legitimate P002 write to AS004. Keeping `program` preserves §7.1 and §7.3;
   * `sharedWith` records the exception the workbook actually contains.
   */
  sharedWith?: ProgramId[]
  outputSchema: 'markdown' | 'json'
  /** Asset Instructions — layer 3 of the Composer (ADR-012). */
  instructionsRef: string
}

export interface ActionDef {
  id: ActionId
  name: string
  /**
   * ADR-020: an Action is one-off or recurring. A "cadence" is the *frequency* of
   * a recurring Action (a value in `scheduled_actions.cadence`), never an entity.
   */
  kind: 'oneoff' | 'recurring'
  /**
   * True for external side effects that cannot be undone: send, publish, spend,
   * change price.
   *
   * THIS FLAG IS A SAFETY PROPERTY. Story 3's Connector boundary reads it to
   * decide whether the founder must approve before anything leaves the building
   * (ADR-004). A wrong `false` here means something sends without asking.
   * Internal or reversible work is `false` and runs autonomously — approval gates
   * exist ONLY at the Connector boundary, never on Programs or internal work
   * (ADR-002).
   */
  irreversible: boolean
  /** Only set when the Action reaches an external system. Implies `irreversible`. */
  connector?: ConnectorId
  /** Action Instructions — layer 3 of the Composer (ADR-012). */
  instructionsRef: string
}

// ─── Errors ───────────────────────────────────────────────────────────────────
//
// Unknown ids throw; they never return undefined silently (F05 US-05.2).
// Shape follows the existing convention — lib/tools/executor.ts:32
// (ToolNotFoundError) and lib/actions/executor.ts:24 (ActionNotFoundError).

export class ExecutiveNotFoundError extends Error {
  constructor(id: string) {
    super(`Unknown executive: ${id}`)
    this.name = 'ExecutiveNotFoundError'
  }
}

export class ProgramNotFoundError extends Error {
  constructor(id: string) {
    super(`Unknown program: ${id}`)
    this.name = 'ProgramNotFoundError'
  }
}

export class AssetNotFoundError extends Error {
  constructor(id: string) {
    super(`Unknown asset: ${id}`)
    this.name = 'AssetNotFoundError'
  }
}

export class ActionNotFoundError extends Error {
  constructor(id: string) {
    super(`Unknown action: ${id}`)
    this.name = 'ActionNotFoundError'
  }
}

/**
 * Thrown at LOAD when the Registry is internally incoherent — a dangling
 * reference, a duplicate id, an Asset whose owner disagrees with the Program
 * claiming it.
 *
 * Deliberately fatal at import time. F05's edge case: "a Program referencing a
 * missing Asset → fail at load with a clear message, not at runtime." A typo in
 * a Registry entry should stop the process on boot, not surface as a confusing
 * null six weeks later, mid-cycle, for one founder.
 */
export class RegistryValidationError extends Error {
  constructor(problems: string[]) {
    super(
      `Registry is invalid — ${problems.length} problem(s):\n` +
        problems.map(p => `  • ${p}`).join('\n'),
    )
    this.name = 'RegistryValidationError'
  }
}
