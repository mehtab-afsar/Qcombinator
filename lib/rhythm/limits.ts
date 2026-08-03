/**
 * F10 — the circuit breaker's ceiling.
 *
 * A run advances by self-triggering steps, and every step is a PAID Claude call. If the
 * "what's next" logic ever fails to advance, the chain bills forever. This module answers the
 * only question the breaker asks: how many steps could a correct run of THIS shape possibly
 * need? Anything beyond that is a bug, not a long week.
 *
 * Pure — no IO, no database, no clock. Kept out of run.ts, which is already at the file-size
 * limit.
 */

import { getProgram } from '@/lib/registry'

/** Machine-readable `failure_reason` written when the fuse blows. Never reuse for anything else. */
export const STEP_LIMIT_EXCEEDED = 'step_limit_exceeded'

/**
 * Slack above the structurally-required step count.
 *
 * It only has to absorb steps that are legitimate but NOT structural: a duplicate delivery that
 * loses the `asset_versions(asset_id, execution_id)` race, or a resumed invocation re-deriving
 * "what's next". Realistic excess is 0-2, so 5 gives roughly 2.5x headroom while capping the
 * wasted spend at ~5 extra calls before the fuse blows.
 */
export const STEP_MARGIN = 5

/**
 * Budget for a Program the Registry can no longer resolve. Generous on purpose — see below.
 *
 * Raised from 8 to 16 when Actions became a rhythm phase: P001's real cost went from 6 steps
 * (5 assets + briefing) to 11 (+5 actions). A fallback that is STINGIER than reality inverts its
 * own purpose — it would false-trip the very run it exists to protect.
 */
const STEPS_PER_UNKNOWN_PROGRAM = 16

/** Every run takes one final pass that finds all stages terminal and calls finishRun. */
const TERMINAL_PASS = 1

/**
 * Steps a correct run needs for one Program: one per Asset, its Briefing, and one per Action.
 *
 * ⚠️ The Actions term is not optional bookkeeping. Without it, P001's happy path (12 claimed
 * steps) would sit exactly at a ceiling of 12 — a perfect run would scrape through with ZERO
 * margin, and the first duplicate delivery or resumed invocation would fail a legitimate cycle
 * with `step_limit_exceeded`, losing that week's briefing. Every phase that costs a step must be
 * counted here, or the breaker stops protecting and starts breaking.
 *
 * Degrades rather than throws. `activePrograms` is DATA stored on a confirmed contract while
 * the Registry is code, so a Registry change can leave a founder holding an id that no longer
 * resolves. Falling back to 0 would be a self-inflicted false trip on a legitimate run — the
 * same reasoning as lib/rhythm/progress.ts's unknown-Program handling.
 */
function stepsForProgram(templateId: string): number {
  try {
    const program = getProgram(templateId)
    return program.assets.length + 1 + program.actions.length
  } catch {
    return STEPS_PER_UNKNOWN_PROGRAM
  }
}

/**
 * The maximum number of steps this run may attempt before the breaker fails it.
 *
 * ⚠️ This bounds STEPS, not model calls: `judge.ts` retries once internally on a transient
 * failure, so the true ceiling in Claude calls is up to ~2x this. It is a fuse against runaway
 * looping, not a token budget.
 *
 * @param activeTemplateIds Programs currently active on the contract.
 * @param touchedTemplateIds Programs this run has already recorded work against
 *        (`Object.keys(run.stages)`). Included so the ceiling is MONOTONIC: pausing a Program
 *        mid-run must never shrink the budget under a run that already spent steps on it, which
 *        would false-trip a nearly-finished cycle.
 */
export function maxStepsForRun(
  activeTemplateIds: readonly string[],
  touchedTemplateIds: readonly string[] = [],
): number {
  const everyProgram = [...new Set([...activeTemplateIds, ...touchedTemplateIds])]
  const structural = everyProgram.reduce((total, id) => total + stepsForProgram(id), 0)
  return structural + TERMINAL_PASS + STEP_MARGIN
}
