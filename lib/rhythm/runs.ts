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
import { STEP_LIMIT_EXCEEDED } from './limits'

export type RunStatus = 'running' | 'completed' | 'failed'

/**
 * No step in `last_step_at` for this long → the chain is presumed broken, not just slow.
 * Single-sourced: the resume decision here and the founder-facing 'stalled' badge
 * (lib/rhythm/progress.ts) must agree on what counts as stalled.
 *
 * Was 10 minutes. A founder whose chain died watched a frozen "working…" for that entire time
 * with no Resume button — the control only appears once a run reads as stalled — and reasonably
 * concluded the product had died with no way back. Halved, because ten minutes of a screen that
 * looks broken is itself the failure.
 *
 * ⚠️ THE FLOOR IS THE LONGEST LEGITIMATE STEP, and this must stay above it. A step may run to
 * maxDuration (200s, app/api/rhythm/step/route.ts); 5 minutes leaves 100s of headroom, so a slow
 * but living step is never mistaken for a dead one. Do not lower this further without lowering
 * maxDuration first — resuming a step that is still running is how you get duplicate model spend.
 * (The asset_versions unique constraint would catch the duplicate write, but only after paying
 * for it.)
 */
export const STALE_AFTER_MS = 5 * 60 * 1000

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
  /** Steps ATTEMPTED — the circuit breaker's counter (see lib/rhythm/limits.ts). */
  stepCount: number
  /** Machine-readable cause, e.g. 'step_limit_exceeded'. Null for an ordinary failure. */
  failureReason: string | null
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
  step_count: number | null
  failure_reason: string | null
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
    // Coerced, not trusted: if code somehow ships before the migration the column is absent,
    // and `undefined >= limit` is false — a silently disabled breaker. 0 fails safe instead.
    stepCount: typeof row.step_count === 'number' ? row.step_count : 0,
    failureReason: row.failure_reason ?? null,
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
 * This week's run tripped the circuit breaker and will NOT be retried automatically.
 *
 * Deliberately not a subclass of CycleAlreadyRanError: "the fuse blew" is not "this week already
 * ran", and a founder should be told the difference. Recovery is a human decision — clearing the
 * row hands the same logic a fresh budget, which is only correct once the bug is fixed.
 */
export class StepLimitOpenError extends Error {
  readonly cycleKey: string
  constructor(cycleKey: string) {
    super(`This week's cycle (${cycleKey}) was stopped by the safety limit and needs looking at.`)
    this.name = 'StepLimitOpenError'
    this.cycleKey = cycleKey
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
 *   running, stale step    → RESUMED IN PLACE, same as a fresh step — see the dedicated comment
 *                             below for why this must NOT delete-and-recreate the row.
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

    // A STALE-BUT-RUNNING row must be resumed IN PLACE, not deleted and recreated — this used
    // to fall through to the same delete-and-retry path as a genuine failure, which silently
    // duplicated real work: the briefing/action dedup indexes (executive_briefings_one_per_run,
    // action_log_one_execution) are keyed to THIS row's execution_id, so a new row orphans
    // already-completed briefing/action rows and runNextStep regenerates them — a second, real
    // briefing generation (and re-run Actions) on top of the first, discovered when scoping
    // auto-resume. The self-trigger chain being broken doesn't mean the WORK already recorded
    // in `stages` is untrustworthy; only the handoff between steps failed. Returning the row
    // unchanged here means the caller re-fires the chain against the same id, and `runNextStep`
    // reads the same `stages` it already had — assets, briefing and actions already done are
    // correctly recognized as done, nothing is redone.
    if (existingRun.status === 'running' && isStale(existingRun)) return existingRun

    // The circuit breaker blew for this week. Falling through to the delete-and-retry path
    // below would hand the same runaway a brand new budget on every cron tick and every manual
    // click — a fuse that resets itself is not a fuse. Recovery is deliberate: fix the bug,
    // then clear the row (or wait for the next cycle_key).
    if (existingRun.status === 'failed' && existingRun.failureReason === STEP_LIMIT_EXCEEDED) {
      throw new StepLimitOpenError(args.cycleKey)
    }

    // Only a genuinely 'failed' run reaches here now — that legitimately warrants a clean
    // slate. The status filter guards a race where the row changed between read and delete —
    // it deletes only if the row is still in the state we just observed.
    const { error: deleteError } = await admin
      .from('operating_rhythm_runs')
      .delete()
      .eq('id', existingRun.id)
      .eq('status', existingRun.status)
    if (deleteError) throw new RunError(`Failed to clear the failed run: ${deleteError.message}`)
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

/**
 * Reserve the next step number before any paid work — the circuit breaker's counter.
 *
 * Compare-and-set on purpose. A plain `step_count = read + 1` loses updates when the chain forks
 * (two live invocations both read 5, both write 6), which under-counts in exactly the situation
 * where the count matters most. With the CAS the counter stays correct under concurrency, so the
 * ceiling still bounds total spend for a forked chain, and the invocation that loses the race
 * drops out instead of double-billing.
 *
 * Honest scope: this does NOT serialise a whole step — one chain can claim step 5 and start a
 * 90-second call while another claims step 6. What it guarantees is that both consume budget.
 *
 * @returns the reserved step number, or null when another invocation claimed it first (or the
 *          run is no longer 'running') — the caller must then stop, not retry.
 * @throws RunError on a database failure. Fails CLOSED: an unusable counter aborts the step
 *         rather than letting it proceed uncounted.
 */
export async function claimStep(
  admin: SupabaseClient,
  runId: string,
  expectedCount: number,
): Promise<number | null> {
  const { data, error } = await admin
    .from('operating_rhythm_runs')
    .update({ step_count: expectedCount + 1 })
    .eq('id', runId)
    .eq('step_count', expectedCount)
    .eq('status', 'running')
    .select('step_count')
    .maybeSingle()

  if (error) throw new RunError(`Failed to claim a step for run ${runId}: ${error.message}`)
  return data ? (data as { step_count: number }).step_count : null
}

/**
 * The founder's most recent run, whatever its status — what the Command View shows.
 * Safe with a USER-scoped client: `operating_rhythm_runs` is SELECT-own under RLS, so the
 * tenancy boundary is the database's, not a filter we could forget.
 */
export async function getLatestRun(
  client: SupabaseClient,
  founderId: string,
): Promise<RhythmRun | null> {
  const { data, error } = await client
    .from('operating_rhythm_runs')
    .select('*')
    .eq('founder_id', founderId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new RunError(`Failed to read the latest run: ${error.message}`)
  return data ? toRun(data as RunRow) : null
}

/**
 * The founder's past cycles, newest first — F09 artifact organization's "Past cycles" list.
 * Returns every status, including failed/stalled ones: an honest history is not just the clean
 * runs. Same RLS-scoping convention as getLatestRun (user-scoped client is safe — SELECT-own).
 */
export async function listRuns(
  client: SupabaseClient,
  founderId: string,
  limit = 10,
): Promise<RhythmRun[]> {
  const { data, error } = await client
    .from('operating_rhythm_runs')
    .select('*')
    .eq('founder_id', founderId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new RunError(`Failed to read run history: ${error.message}`)
  return (data ?? []).map(row => toRun(row as RunRow))
}

/**
 * Close the run with its terminal status and per-stage detail.
 *
 * `failureReason` is machine-readable and only set for a non-ordinary failure (today: the
 * circuit breaker). It is what stops createOrResumeRun auto-retrying a blown fuse.
 */
export async function finishRun(
  admin: SupabaseClient,
  runId: string,
  outcome: { status: RunStatus; stages: Record<string, unknown>; failureReason?: string },
): Promise<void> {
  const { error } = await admin
    .from('operating_rhythm_runs')
    .update({
      status: outcome.status,
      stages: outcome.stages,
      completed_at: new Date().toISOString(),
      failure_reason: outcome.failureReason ?? null,
    })
    .eq('id', runId)

  if (error) throw new RunError(`Failed to finish run ${runId}: ${error.message}`)
}
