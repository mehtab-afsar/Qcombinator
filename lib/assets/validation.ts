/**
 * F11 — the Asset persistence validation gate (UC-11 step 2).
 *
 * Runs in TypeScript, BEFORE persist_asset_version, because the Registry is code,
 * not data (ADR-010): "does AS001 belong to P001" cannot be a database constraint.
 * The write path is server-side only (the function is revoked from authenticated and
 * the table has no authenticated write policy), so this gate cannot be bypassed.
 *
 * Checks 6 (sequential version) and 7 (not already persisted for this execution) are
 * enforced by database indexes, not here — see the migration.
 */

import { getAsset, getProgram, listProgramsForAsset } from '@/lib/registry'
import type { PersistAssetArgs } from './versioning'

/** A blocked persistence. `code` is machine-readable; the message is for logs/humans. */
export class AssetPersistenceError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AssetPersistenceError'
    this.code = code
  }
}

export interface ValidatedAsset {
  /** The owning ExecutiveId, derived from the Registry (AssetDef has no executive field). */
  executiveId: string
}

/** Content must match the Asset's declared output format and be non-empty (checks 3 + 4). */
function assertContentShape(schema: 'markdown' | 'json', content: unknown): void {
  if (schema === 'markdown') {
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new AssetPersistenceError('bad_structure', 'markdown asset content must be a non-empty string')
    }
    return
  }
  const isObject = content !== null && typeof content === 'object' && !Array.isArray(content)
  if (!isObject || Object.keys(content as Record<string, unknown>).length === 0) {
    throw new AssetPersistenceError('bad_structure', 'json asset content must be a non-empty object')
  }
}

/**
 * Validate a persistence request. Throws AssetPersistenceError on any failure;
 * returns the derived Executive on success.
 */
export function validateAssetPersist(args: PersistAssetArgs): ValidatedAsset {
  // 1. Asset ID exists in the Registry.
  let outputSchema: 'markdown' | 'json'
  let owningProgram: string
  try {
    const asset = getAsset(args.assetId)
    outputSchema = asset.outputSchema
    owningProgram = asset.program
  } catch {
    throw new AssetPersistenceError('unknown_asset', `Asset ${args.assetId} is not in the Registry`)
  }

  // 2. Belongs to the correct Program/Executive — only meaningful for program authorship.
  //    (A founder may edit any of their Assets directly; ADR-007.)
  let executiveId: string
  if (args.authoredBy === 'program') {
    if (!args.programTemplateId) {
      throw new AssetPersistenceError('missing_program', 'program authorship requires a program template id')
    }
    const allowed = listProgramsForAsset(args.assetId)
    if (!allowed.some(p => p === args.programTemplateId)) {
      throw new AssetPersistenceError(
        'wrong_program',
        `${args.programTemplateId} may not write ${args.assetId} (maintained by ${allowed.join(', ')})`,
      )
    }
    // The Executive is the WRITING program's owner (AS004 written by P002 → P002's owner).
    executiveId = getProgram(args.programTemplateId).owner
  } else {
    executiveId = getProgram(owningProgram).owner
  }

  // 3 + 4. Output matches the required structure, and is complete (non-empty).
  assertContentShape(outputSchema, args.content)

  // 5. Valid execution reference: program ⟹ present, founder ⟹ absent (also a DB CHECK).
  const hasExecution = Boolean(args.executionId)
  if (args.authoredBy === 'program' && !hasExecution) {
    throw new AssetPersistenceError('missing_execution', 'program-authored versions require an execution id')
  }
  if (args.authoredBy === 'founder' && hasExecution) {
    throw new AssetPersistenceError('unexpected_execution', 'founder edits must not carry an execution id')
  }

  return { executiveId }
}
