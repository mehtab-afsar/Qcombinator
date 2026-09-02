/**
 * F14 — `action_log` access. Append-only, service-role only.
 *
 * Every Action attempt lands here, **including the ones that were denied** — a log that records
 * only successes cannot answer the question an audit is for. A status change APPENDS a new row
 * rather than updating one (the table's trigger enforces this), so an Action's life is a
 * sequence of rows sharing a `payload_hash`, not one row edited four times.
 *
 * Nothing here calls the score signal (ADR-005).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import type { ProgramInstance } from '@/lib/mandate/contract'
import type { ActionPayload } from './payload'
import { hashPayload, payloadMetadata } from './payload'

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
  /** The idempotency slot is held and the provider call is in flight. Not a completed send. */
  | 'sending'
  | 'executed'
  | 'failed'
  | 'declined'
  /** Genuinely undetermined — e.g. a send that timed out and has not yet been reconciled. */
  | 'unknown'

export interface ActionLogEntry {
  id: string
  founderId: string
  programId: string | null
  executionId: string | null
  actionId: string
  provider: string | null
  irreversible: boolean
  status: ActionStatus
  payloadHash: string | null
  /** A Supabase Vault secret id holding the REAL payload — never the content itself. Null for
   *  every reversible/internal Action, and for any row once the payload's been cleaned up
   *  (approved-and-executed, declined, or expired). See lib/actions/payload-vault.ts. */
  payloadRef: string | null
  request: Record<string, unknown>
  result: Record<string, unknown> | null
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
}

/** An entry with its owning Program/Executive resolved — see attachOwners. */
export interface OwnedActionLogEntry extends ActionLogEntry {
  /** The Registry Program id, e.g. 'P001' — null if programId is null or unresolvable. */
  programTemplateId: string | null
  /** The Program's owning Executive, e.g. 'growth' — null under the same conditions. */
  executiveId: string | null
}

interface ActionLogRow {
  id: string
  founder_id: string
  program_id: string | null
  execution_id: string | null
  action_id: string
  provider: string | null
  irreversible: boolean
  status: ActionStatus
  payload_hash: string | null
  payload_ref: string | null
  request: unknown
  result: unknown
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

function toEntry(row: ActionLogRow): ActionLogEntry {
  return {
    id: row.id,
    founderId: row.founder_id,
    programId: row.program_id,
    executionId: row.execution_id,
    actionId: row.action_id,
    provider: row.provider,
    irreversible: row.irreversible,
    status: row.status,
    payloadHash: row.payload_hash,
    payloadRef: row.payload_ref ?? null,
    request: (row.request && typeof row.request === 'object' ? row.request : {}) as Record<string, unknown>,
    result: (row.result && typeof row.result === 'object' ? row.result : null) as Record<string, unknown> | null,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  }
}

export class ActionLogError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ActionLogError'
    this.code = code
  }
}

/**
 * This Action already executed for this run.
 *
 * Raised from the unique index, not from a read-then-write check — so a double-clicked approval
 * or a retried request is stopped by the database rather than by a race we have to get right.
 * The caller should treat it as success-already-done, never retry.
 */
export class AlreadyExecutedError extends ActionLogError {
  constructor(actionId: string) {
    super('already_executed', `Action '${actionId}' has already executed for this run.`)
    this.name = 'AlreadyExecutedError'
  }
}

export interface RecordAttemptArgs {
  founderId: string
  actionId: string
  irreversible: boolean
  status: ActionStatus
  programId?: string | null
  executionId?: string | null
  /** See GenerateActionArgs.dedupeKey — idempotency for a run that has no execution_id. */
  dedupeKey?: string | null
  provider?: string | null
  /** Hashed and reduced to metadata here — the caller never decides what is safe to store. */
  payload?: ActionPayload
  /**
   * An ALREADY-computed hash, for rows that record a DECISION about a payload rather than the
   * payload itself (approve/decline). Without it those rows carry a null hash and the "sequence
   * of rows sharing a payload_hash" design silently breaks — you could no longer prove which
   * payload an approval was for, which is the whole point of the binding.
   */
  payloadHash?: string | null
  /** A Supabase Vault secret id — see ActionLogEntry.payloadRef. Passed straight through, never
   *  derived here (unlike payloadHash, this file never touches the real content). */
  payloadRef?: string | null
  result?: Record<string, unknown> | null
  approvedBy?: string | null
}

/**
 * Append one attempt.
 *
 * The payload is hashed and redacted **inside this function** rather than by the caller: making
 * it the caller's job is how a body eventually reaches the log. Callers pass the real payload;
 * only metadata and a hash are persisted.
 *
 * @throws AlreadyExecutedError when this action already executed for this run (23505).
 * @throws ActionLogError on any other write failure — never swallowed.
 */
export async function recordAttempt(
  admin: SupabaseClient,
  args: RecordAttemptArgs,
): Promise<ActionLogEntry> {
  const { data, error } = await admin
    .from('action_log')
    .insert({
      founder_id: args.founderId,
      program_id: args.programId ?? null,
      execution_id: args.executionId ?? null,
      dedupe_key: args.dedupeKey ?? null,
      action_id: args.actionId,
      provider: args.provider ?? null,
      irreversible: args.irreversible,
      status: args.status,
      payload_hash: args.payload ? hashPayload(args.payload) : (args.payloadHash ?? null),
      payload_ref: args.payloadRef ?? null,
      request: args.payload ? payloadMetadata(args.payload) : {},
      result: args.result ?? null,
      approved_by: args.approvedBy ?? null,
      approved_at: args.approvedBy ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      log.warn('action already executed for this run', { actionId: args.actionId, code: error.code })
      throw new AlreadyExecutedError(args.actionId)
    }
    throw new ActionLogError('write_failed', `Failed to log action ${args.actionId}: ${error.message}`)
  }
  return toEntry(data as ActionLogRow)
}

/**
 * Reduce newest-first rows to one entry per Action id — an Action's CURRENT state, since the
 * table is append-only and "what is the state of this action" is the newest row, not a mutable
 * column. Deduped in code rather than with a window function, because the row counts here are
 * tiny (actions per program per run, or per founder) and the SQL stays legible. Shared by
 * latestPerAction (scoped to one run) and latestPerActionForFounder (scoped to the founder,
 * across every run they've ever had) — the reduction is identical, only the query scope differs.
 */
function dedupeLatestByActionId(rows: readonly ActionLogRow[]): ActionLogEntry[] {
  const seen = new Set<string>()
  return rows.map(toEntry).filter(e => {
    if (seen.has(e.actionId)) return false
    seen.add(e.actionId)
    return true
  })
}

/**
 * The row a dedupe key already produced, if any — the CHEAP half of ad-hoc idempotency.
 *
 * The unique index is what makes idempotency correct (it wins a race; a read-then-write cannot).
 * This is what makes it cheap: `generateAction` calls the model BEFORE it writes, so relying on
 * the index alone means a second click still pays for a second Claude call and only then gets a
 * 23505. Checking first turns the common case — a double click, a second tab, a refresh — into
 * one indexed read. The index stays as the backstop for the case this read cannot cover.
 *
 * Returns null on a query error rather than throwing: failing to read the cache must not block
 * the founder, and the index still catches an actual duplicate.
 */
export async function findByDedupeKey(
  client: SupabaseClient,
  founderId: string,
  dedupeKey: string,
): Promise<ActionLogEntry | null> {
  const { data, error } = await client
    .from('action_log')
    .select('*')
    .eq('founder_id', founderId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()

  if (error) {
    log.warn('dedupe lookup failed, falling through to the unique index', { code: error.code })
    return null
  }
  return data ? toEntry(data as ActionLogRow) : null
}

/** The latest entry per action for one run — an Action's CURRENT state within that execution. */
export async function latestPerAction(
  client: SupabaseClient,
  founderId: string,
  executionId: string,
): Promise<ActionLogEntry[]> {
  const { data, error } = await client
    .from('action_log')
    .select('*')
    .eq('founder_id', founderId)
    .eq('execution_id', executionId)
    .order('created_at', { ascending: false })

  if (error) throw new ActionLogError('read_failed', `Failed to read the action log: ${error.message}`)
  return dedupeLatestByActionId((data ?? []) as ActionLogRow[])
}

/**
 * The latest entry per action across EVERY run the founder has ever had — F09 Stage 5's honest
 * action surface. `latestPerAction` is scoped to a single execution and has always had zero
 * callers outside tests; this is the founder-wide sibling the Command View actually needs, not
 * an overload, since latestPerAction's existing contract (one specific run) stays intact for
 * whatever future caller wants a single execution's outcome.
 */
export async function latestPerActionForFounder(
  client: SupabaseClient,
  founderId: string,
): Promise<ActionLogEntry[]> {
  const { data, error } = await client
    .from('action_log')
    .select('*')
    .eq('founder_id', founderId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new ActionLogError('read_failed', `Failed to read the action log: ${error.message}`)
  return dedupeLatestByActionId((data ?? []) as ActionLogRow[])
}

/**
 * Everything genuinely waiting on the founder right now, newest first.
 *
 * ⚠️ It is NOT enough to filter `status = 'pending_approval'`. The table is append-only, so
 * approving does not change the original row — it adds an `approved` row beside it. Filtering on
 * status alone therefore returns the item forever: the founder approves, watches it stay in the
 * queue, and can approve it again. (Found by clicking the button, not by reading the code.)
 *
 * An action is pending only if its LATEST row says so. Identity across the sequence is
 * (action_id, execution_id) — the same key the execution unique index uses.
 */
export async function pendingApprovals(
  client: SupabaseClient,
  founderId: string,
): Promise<ActionLogEntry[]> {
  const { data, error } = await client
    .from('action_log')
    .select('*')
    .eq('founder_id', founderId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new ActionLogError('read_failed', `Failed to read pending approvals: ${error.message}`)

  const latestSeen = new Set<string>()
  return (data ?? [])
    .map(r => toEntry(r as ActionLogRow))
    .filter(e => {
      const key = `${e.actionId}:${e.executionId ?? ''}`
      if (latestSeen.has(key)) return false // an older row for an action already resolved
      latestSeen.add(key)
      return e.status === 'pending_approval'
    })
}

/**
 * Resolve each entry's owning Program/Executive, for the Command View's per-executive grouping.
 *
 * `action_log` has no executive column at all — the only fact it stores is `programId`, the DB
 * row UUID of `programs`. Resolving to a human Registry id ('P001') and an Executive ('growth')
 * means joining against the contract's own `programs[]`, which `/api/contracts` already fetches —
 * this function does the join, not a second database round trip.
 *
 * Pure and unit-testable without Supabase, matching pickLatestPerProgram
 * (lib/briefings/briefings.ts) and buildProgress (lib/rhythm/progress.ts).
 */
export function attachOwners(
  entries: readonly ActionLogEntry[],
  programs: readonly Pick<ProgramInstance, 'id' | 'templateId' | 'owner'>[],
): OwnedActionLogEntry[] {
  const byId = new Map(programs.map(p => [p.id, p]))
  return entries.map(e => {
    const program = e.programId ? byId.get(e.programId) : undefined
    return {
      ...e,
      programTemplateId: program?.templateId ?? null,
      executiveId: program?.owner ?? null,
    }
  })
}
