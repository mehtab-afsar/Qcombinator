/**
 * F10 — operating_rhythm_runs access. The run row is created FIRST (fail-fast on a duplicate
 * week), then advanced one chunked step at a time, then finished with a status + per-stage
 * detail. Service-role only (the table is read-only for authenticated).
 *
 * Chunking changed what 'running' means: it used to mean "one 8-minute invocation is mid-flight
 * (or crashed)". Now it's the NORMAL state for a run spanning many short self-triggered steps —
 * so a caller can no longer tell "actively progressing" from "abandoned mid-chunk" by status
 * alone. `last_step_at` is that signal (FU-004): touched on every step, checked for staleness
 * before deciding whether a 'running' row should be resumed or treated as abandoned.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type RunStatus = 'running' | 'completed' | 'failed'

/** No step in `last_step_at` for this long → the chain is presumed broken, not just slow. */
const STALE_AFTER_MS = 10 * 60 * 1000

export interface RhythmRun {
  id: string
  founderId: string
  contractId: string | null
  cycleKey: string
  status: RunStatus
  stages: Record<string, unknown>
  startedAt: string
  completedAt: string | null
  lastStepAt: string
}

interface RunRow {
  id: string
  founder_id: string
  contract_id: string | null
  cycle_key: string
  status: RunStatus
  stages: unknown
  started_at: string
  completed_at: string | null
  last_step_at: string
}

function toRun(row: RunRow): RhythmRun {
  return {
    id: row.id,
    founderId: row.founder_id,
    contractId: row.contract_id,
    cycleKey: row.cycle_key,
    status: row.status,
    stages: (row.stages && typeof row.stages === 'object' ? row.stages : {}) as Record<string, unknown>,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastStepAt: row.last_step_at,
  }
}

function isStale(run: Pick<RhythmRun, 'lastStepAt'>): boolean {
  return Date.now() - new Date(run.lastStepAt).getTime() > STALE_AFTER_MS
}

/** The cycle already ran this week — the idempotency guarantee, surfaced (not swallowed). */
export class CycleAlreadyRanError extends Error {
  readonly cycleKey: string
  constructor(cycleKey: string) {
    super(`This week's cycle (${cycleKey}) has already run.`)
    this.name = 'CycleAlreadyRanError'
    this.cycleKey = cycleKey
  }
}

export class RunError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunError'
  }
}

/**
 * Create the run row, or resume one already in progress. Must happen before any LLM work: the
 * unique (founder_id, cycle_key) constraint makes a duplicate trigger fail here, for free.
 *
 * B5 + FU-004 — a FAILED or ABANDONED week is retryable without weakening idempotency for
 * successful or actively-progressing runs:
 *   completed              → CycleAlreadyRanError (the guarantee, unchanged)
 *   running, fresh step    → RESUMED — returned as-is; chunking made 'running' the NORMAL state
 *                             for a run spanning many short self-triggered steps, not just a
 *                             single invocation mid-flight
 *   running, stale step    → treated like failed: the self-trigger chain is presumed broken,
 *                             not merely slow (last_step_at unchanged for STALE_AFTER_MS)
 *   failed                 → delete the stale row and start fresh. Its partial asset/briefing
 *                             execution_ids go NULL (on delete set null); the versions and
 *                             briefings themselves remain as history — nothing is destroyed
 *                             but the run record.
 * Two concurrent retries still serialize on the unique constraint at the insert (23505).
 *
 * @throws CycleAlreadyRanError on a completed week or a lost race; RunError otherwise.
 */
export async function createOrResumeRun(
  admin: SupabaseClient,
  args: { founderId: string; contractId: string | null; cycleKey: string },
): Promise<RhythmRun> {
  const { data: existing, error: readError } = await admin
    .from('operating_rhythm_runs')
    .select('*')
    .eq('founder_id', args.founderId)
    .eq('cycle_key', args.cycleKey)
    .maybeSingle()

  if (readError) throw new RunError(`Failed to check for an existing run: ${readError.message}`)

  if (existing) {
    const existingRun = toRun(existing as RunRow)
    if (existingRun.status === 'completed') throw new CycleAlreadyRanError(args.cycleKey)
    if (existingRun.status === 'running' && !isStale(existingRun)) return existingRun

    // 'failed', or 'running'-but-stale: clear and start fresh. The status filter guards a
    // race where the row changed between read and delete — it deletes only if the row is
    // still in the state we just observed.
    const { error: deleteError } = await admin
      .from('operating_rhythm_runs')
      .delete()
      .eq('id', existingRun.id)
      .eq('status', existingRun.status)
    if (deleteError) throw new RunError(`Failed to clear the stale run: ${deleteError.message}`)
  }

  const { data, error } = await admin
    .from('operating_rhythm_runs')
    .insert({ founder_id: args.founderId, contract_id: args.contractId, cycle_key: args.cycleKey })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new CycleAlreadyRanError(args.cycleKey)
    throw new RunError(`Failed to create run: ${error.message}`)
  }
  return toRun(data as RunRow)
}

/** Fetch a run by id — how a chunked step (a fresh invocation, no memory of prior ones) resumes. */
export async function getRun(admin: SupabaseClient, runId: string): Promise<RhythmRun | null> {
  const { data, error } = await admin.from('operating_rhythm_runs').select('*').eq('id', runId).maybeSingle()
  if (error) throw new RunError(`Failed to read run ${runId}: ${error.message}`)
  return data ? toRun(data as RunRow) : null
}

/**
 * Persist progress after one chunked step (one asset or one briefing generation). Status stays
 * 'running' — only finishRun sets a terminal status. Touching last_step_at here is what lets a
 * future createOrResumeRun tell "still actively stepping" apart from "chain broke" (FU-004).
 */
export async function recordStep(
  admin: SupabaseClient,
  runId: string,
  stages: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin
    .from('operating_rhythm_runs')
    .update({ stages, last_step_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw new RunError(`Failed to record a step for run ${runId}: ${error.message}`)
}

/** The founder's most recent COMPLETED run — the delta window's start (ADR-028). Null = first cycle. */
export async function getLastCompletedRun(
  admin: SupabaseClient,
  founderId: string,
): Promise<RhythmRun | null> {
  const { data, error } = await admin
    .from('operating_rhythm_runs')
    .select('*')
    .eq('founder_id', founderId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new RunError(`Failed to read the last completed run: ${error.message}`)
  return data ? toRun(data as RunRow) : null
}

/** Close the run with its terminal status and per-stage detail. */
export async function finishRun(
  admin: SupabaseClient,
  runId: string,
  outcome: { status: RunStatus; stages: Record<string, unknown> },
): Promise<void> {
  const { error } = await admin
    .from('operating_rhythm_runs')
    .update({ status: outcome.status, stages: outcome.stages, completed_at: new Date().toISOString() })
    .eq('id', runId)

  if (error) throw new RunError(`Failed to finish run ${runId}: ${error.message}`)
}
