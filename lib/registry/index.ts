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

import { CEO } from './executives/ceo'
import { GROWTH } from './executives/growth'
import { PRODUCT } from './executives/product'
import { OPERATIONS } from './executives/operations'
import { FINANCE } from './executives/finance'

import { P001_GTM } from './programs/growth/p001-gtm'

import { AS001_ICP_PROFILES } from './assets/growth/as001-icp'
import { AS002_PAINS_GAINS_MATRIX } from './assets/growth/as002-pains-gains'
import { AS003_BUYER_JOURNEY_MAP } from './assets/growth/as003-buyer-journey'
import { AS004_POSITIONING_MESSAGING } from './assets/growth/as004-positioning'
import { AS005_CHANNEL_STRATEGY } from './assets/growth/as005-channel-strategy'

import { VALIDATE_ICPS } from './actions/validate-icps'
import { INTERVIEW_CUSTOMERS } from './actions/interview-customers'
import { PRIORITIZE_CHANNELS } from './actions/prioritize-channels'
import { REVIEW_MESSAGING } from './actions/review-messaging'
import { APPROVE_GTM_PLAN } from './actions/approve-gtm-plan'

export * from './types'

// ─── The catalogue ────────────────────────────────────────────────────────────
// To add a Program: write its file, import it, add it here. That is the whole
// procedure — no route, no migration, no engine change.

const EXECUTIVES: readonly Executive[] = [CEO, GROWTH, PRODUCT, OPERATIONS, FINANCE]

const PROGRAMS: readonly ProgramTemplate[] = [P001_GTM]

const ASSETS: readonly AssetDef[] = [
  AS001_ICP_PROFILES,
  AS002_PAINS_GAINS_MATRIX,
  AS003_BUYER_JOURNEY_MAP,
  AS004_POSITIONING_MESSAGING,
  AS005_CHANNEL_STRATEGY,
]

const ACTIONS: readonly ActionDef[] = [
  VALIDATE_ICPS,
  INTERVIEW_CUSTOMERS,
  PRIORITIZE_CHANNELS,
  REVIEW_MESSAGING,
  APPROVE_GTM_PLAN,
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
