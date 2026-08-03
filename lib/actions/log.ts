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
import type { ActionPayload } from './payload'
import { hashPayload, payloadMetadata } from './payload'

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
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
  request: Record<string, unknown>
  result: Record<string, unknown> | null
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
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
      action_id: args.actionId,
      provider: args.provider ?? null,
      irreversible: args.irreversible,
      status: args.status,
      payload_hash: args.payload ? hashPayload(args.payload) : (args.payloadHash ?? null),
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
 * The latest entry per action for a run — an Action's CURRENT state.
 *
 * Because the table is append-only, "what is the state of this action" is the newest row, not a
 * mutable column. Ordered newest-first and deduped in code rather than with a window function,
 * because the row counts here are tiny (actions per program per run) and the SQL stays legible.
 */
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

  const seen = new Set<string>()
  return (data ?? []).map(r => toEntry(r as ActionLogRow)).filter(e => {
    if (seen.has(e.actionId)) return false
    seen.add(e.actionId)
    return true
  })
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
