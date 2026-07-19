/**
 * F11 — Asset Persistence & Versioning. The single writer/reader for asset_versions
 * (the company's versioned memory). Routes stay thin and call in here (CLAUDE.md §2).
 *
 * Versioned, never overwritten: persisting retires the current version and inserts a
 * new one, atomically, inside persist_asset_version() (see the migration). The founder
 * can edit directly, which is the same path with authored_by='founder' (ADR-007).
 *
 * Nothing in this module calls the score signal — creating an Asset never moves the
 * Q-Score (ADR-005). Asserted by __tests__/score-invariant.test.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { validateAssetPersist, AssetPersistenceError } from './validation'

export type AuthoredBy = 'program' | 'founder'

export interface AssetVersion {
  id: string
  founderId: string
  assetId: string
  programId: string | null
  executionId: string | null
  version: number
  isCurrent: boolean
  content: unknown
  registryVersion: string | null
  executiveId: string | null
  authoredBy: AuthoredBy
  previousVersionId: string | null
  sourceRefs: unknown[]
  updateReason: string | null
  createdAt: string
}

/** Everything the persistence path needs. The gate (validation.ts) reads these. */
export interface PersistAssetArgs {
  founderId: string
  assetId: string
  authoredBy: AuthoredBy
  /** markdown string or json object — must match the Registry outputSchema. */
  content: unknown
  /** Registry ProgramId of the writing program (required for program authorship). */
  programTemplateId?: string
  /** programs-table row id, or null for founder edits. */
  programId?: string | null
  /** run id — required for program authorship, absent for founder edits. */
  executionId?: string | null
  registryVersion?: string | null
  sourceRefs?: unknown[]
  updateReason?: string | null
}

interface AssetVersionRow {
  id: string
  founder_id: string
  asset_id: string
  program_id: string | null
  execution_id: string | null
  version: number
  is_current: boolean
  content: unknown
  registry_version: string | null
  executive_id: string | null
  authored_by: AuthoredBy
  previous_version_id: string | null
  source_refs: unknown
  update_reason: string | null
  created_at: string
}

function toVersion(row: AssetVersionRow): AssetVersion {
  return {
    id: row.id,
    founderId: row.founder_id,
    assetId: row.asset_id,
    programId: row.program_id,
    executionId: row.execution_id,
    version: row.version,
    isCurrent: row.is_current,
    content: row.content,
    registryVersion: row.registry_version,
    executiveId: row.executive_id,
    authoredBy: row.authored_by,
    previousVersionId: row.previous_version_id,
    sourceRefs: Array.isArray(row.source_refs) ? row.source_refs : [],
    updateReason: row.update_reason,
    createdAt: row.created_at,
  }
}

/** The founder's current version of one Asset, or null if none exists yet. */
export async function getCurrentAsset(
  supabase: SupabaseClient,
  founderId: string,
  assetId: string,
): Promise<AssetVersion | null> {
  const { data, error } = await supabase
    .from('asset_versions')
    .select('*')
    .eq('founder_id', founderId)
    .eq('asset_id', assetId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw new AssetPersistenceError('read_failed', `Failed to read asset ${assetId}: ${error.message}`)
  return data ? toVersion(data as AssetVersionRow) : null
}

/**
 * Every Asset version written by one execution (rhythm run). Used to tell what changed
 * this cycle — F12's briefing generator reads it, and F10 will too.
 */
export async function getAssetVersionsForExecution(
  supabase: SupabaseClient,
  founderId: string,
  executionId: string,
): Promise<AssetVersion[]> {
  const { data, error } = await supabase
    .from('asset_versions')
    .select('*')
    .eq('founder_id', founderId)
    .eq('execution_id', executionId)

  if (error) throw new AssetPersistenceError('read_failed', `Failed to read run assets: ${error.message}`)
  return (data ?? []).map(r => toVersion(r as AssetVersionRow))
}

/** Full version history for one Asset, newest first. Nothing is ever deleted. */
export async function getAssetHistory(
  supabase: SupabaseClient,
  founderId: string,
  assetId: string,
): Promise<AssetVersion[]> {
  const { data, error } = await supabase
    .from('asset_versions')
    .select('*')
    .eq('founder_id', founderId)
    .eq('asset_id', assetId)
    .order('version', { ascending: false })

  if (error) throw new AssetPersistenceError('read_failed', `Failed to read history for ${assetId}: ${error.message}`)
  return (data ?? []).map(r => toVersion(r as AssetVersionRow))
}

/**
 * Persist a new Asset version. Runs the validation gate, then the atomic DB function.
 *
 * MUST be given a service-role client: the function is revoked from authenticated so
 * the gate cannot be bypassed. The caller (a server route) is responsible for having
 * verified that `args.founderId` is the authenticated founder.
 *
 * @throws AssetPersistenceError — validation failure, a lost concurrent race, or a
 *         duplicate execution. Never swallowed: the caller must know the write did not land.
 */
export async function persistAssetVersion(
  admin: SupabaseClient,
  args: PersistAssetArgs,
): Promise<AssetVersion> {
  const { executiveId } = validateAssetPersist(args)

  const { data, error } = await admin.rpc('persist_asset_version', {
    p_founder_id: args.founderId,
    p_asset_id: args.assetId,
    p_program_id: args.programId ?? null,
    p_execution_id: args.executionId ?? null,
    p_content: args.content,
    p_authored_by: args.authoredBy,
    p_executive_id: executiveId,
    p_registry_version: args.registryVersion ?? null,
    p_source_refs: args.sourceRefs ?? [],
    p_update_reason: args.updateReason ?? null,
  })

  if (error) {
    // 23505 = unique_violation: a concurrent write won the one-current race, or this
    // execution was already persisted (the dedupe index). Both mean: it did not land.
    if (error.code === '23505') {
      log.warn('asset version write lost a race or duplicated an execution', {
        founderId: args.founderId, assetId: args.assetId, code: error.code,
      })
      throw new AssetPersistenceError(
        'conflict',
        'This asset changed while saving, or this execution was already persisted. Reload and try again.',
      )
    }
    throw new AssetPersistenceError('write_failed', `Failed to persist asset ${args.assetId}: ${error.message}`)
  }

  return toVersion(data as AssetVersionRow)
}
