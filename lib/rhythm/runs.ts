/**
 * F10 — operating_rhythm_runs access. The run row is created FIRST (fail-fast on a duplicate
 * week), then finished with a status + per-stage detail. Service-role only (the table is
 * read-only for authenticated).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type RunStatus = 'running' | 'completed' | 'failed'

export interface RhythmRun {
  id: string
  founderId: string
  contractId: string | null
  cycleKey: string
  status: RunStatus
  stages: Record<string, unknown>
  startedAt: string
  completedAt: string | null
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
  }
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
 * Create the run row. Must happen before any LLM work: the unique (founder_id, cycle_key)
 * constraint makes a duplicate trigger fail here, for free.
 *
 * B5 — a FAILED week is retryable without weakening idempotency for successful runs:
 *   completed → CycleAlreadyRanError (the guarantee, unchanged)
 *   running   → CycleAlreadyRanError (never race a live run; a crashed 'running' row is a
 *               known limitation — see FOLLOWUPS — better stuck than doubled)
 *   failed    → delete the stale row and start fresh. Its partial asset/briefing
 *               execution_ids go NULL (on delete set null); the versions and briefings
 *               themselves remain as history — nothing is destroyed but the run record.
 * Two concurrent retries still serialize on the unique constraint at the insert (23505).
 *
 * @throws CycleAlreadyRanError on a completed/running week or a lost race; RunError otherwise.
 */
export async function createRun(
  admin: SupabaseClient,
  args: { founderId: string; contractId: string | null; cycleKey: string },
): Promise<RhythmRun> {
  const { data: existing, error: readError } = await admin
    .from('operating_rhythm_runs')
    .select('id, status')
    .eq('founder_id', args.founderId)
    .eq('cycle_key', args.cycleKey)
    .maybeSingle()

  if (readError) throw new RunError(`Failed to check for an existing run: ${readError.message}`)

  if (existing) {
    if (existing.status !== 'failed') throw new CycleAlreadyRanError(args.cycleKey)
    // The status filter guards a race where the run changed between read and delete —
    // it deletes only if the row is still 'failed'.
    const { error: deleteError } = await admin
      .from('operating_rhythm_runs')
      .delete()
      .eq('id', existing.id)
      .eq('status', 'failed')
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
