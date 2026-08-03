/**
 * F10 — the circuit breaker's runtime half. `limits.ts` computes the ceiling; this claims
 * against it.
 *
 * Split out of run.ts, which reached the file-size limit when Actions became a phase. Keeping
 * the claim next to the ceiling it enforces makes the pair legible: one file decides how many
 * steps a run may take, the other decides whether this step is allowed to happen.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProgramInstance } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'
import { claimStep, finishRun, type RhythmRun } from './runs'
import { maxStepsForRun, STEP_LIMIT_EXCEEDED } from './limits'

/**
 * The circuit breaker. Every step is a paid Claude call that schedules the next one, so a bug in
 * the "what's next" logic would bill forever. This is the hard stop.
 *
 * The counter it reads lives in its own column and is claimed BEFORE any generation —
 * deliberately independent of `stages`, because the failure mode being guarded against is one
 * where `stages` stops advancing. A counter that lived in `stages` would stop advancing with it.
 *
 * @returns a result when the caller must STOP (`done: true` — the chain must not self-schedule
 *          again), or null to proceed with one step.
 */
export async function claimStepBudget(
  admin: SupabaseClient,
  run: RhythmRun,
  programs: readonly ProgramInstance[],
  stages: Record<string, unknown>,
): Promise<{ done: boolean } | null> {
  const limit = maxStepsForRun(programs.map(p => p.templateId), Object.keys(stages))

  if (run.stepCount >= limit) {
    // A stable string worth alerting on: a breaker that trips unnoticed is a founder who
    // silently stops receiving briefings.
    log.error('rhythm circuit breaker tripped — run exceeded its step ceiling', {
      runId: run.id, founderId: run.founderId, cycleKey: run.cycleKey,
      stepCount: run.stepCount, limit, reason: STEP_LIMIT_EXCEEDED,
    })
    await finishRun(admin, run.id, { status: 'failed', stages, failureReason: STEP_LIMIT_EXCEEDED })
    return { done: true }
  }

  if ((await claimStep(admin, run.id, run.stepCount)) === null) {
    log.warn('rhythm step claim lost — another invocation is already stepping this run', {
      runId: run.id, stepCount: run.stepCount,
    })
    return { done: true }
  }
  return null
}
