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
 * @throws CycleAlreadyRanError on a duplicate week (23505); RunError otherwise.
 */
export async function createRun(
  admin: SupabaseClient,
  args: { founderId: string; contractId: string | null; cycleKey: string },
): Promise<RhythmRun> {
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
