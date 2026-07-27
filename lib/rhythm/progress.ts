/**
 * F10 — the founder-facing projection of a run's progress.
 *
 * A run's `stages` jsonb is engine bookkeeping ("assetsDone: [AS001, AS002]"). This turns it
 * into what a founder actually reads: an ordered list of named steps, each done/active/pending,
 * plus "3 of 6". Pure — no IO, no client. It lives here rather than in the panel because the
 * frontend renders state, it never derives it (CLAUDE.md §2).
 *
 * Honest by construction: a step is only 'done' once the engine persisted it, 'skipped' says
 * nothing needed doing (ADR-028), and a 'running' run whose chain died reads 'stalled' rather
 * than spinning forever.
 */

import { getProgram, getAsset } from '@/lib/registry'
import { STALE_AFTER_MS, type RhythmRun, type RunStatus } from './runs'

export type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'

export interface ProgressStep {
  /** Stable key for React, e.g. 'P001:AS001' or 'P001:briefing'. */
  key: string
  /** What the founder reads, e.g. 'ICP Profiles' — resolved from the Registry. */
  label: string
  state: StepState
}

export interface RunProgress {
  runId: string
  cycleKey: string
  status: RunStatus
  /** Running, but no step has landed for STALE_AFTER_MS — the chain broke (FU-004). */
  stalled: boolean
  /**
   * Machine-readable cause when this wasn't an ordinary failure — today only
   * 'step_limit_exceeded' (the circuit breaker). Lets the panel explain a stop that would
   * otherwise look unexplained, because a tripped run's stages are left exactly as they were.
   */
  failureReason: string | null
  /** Steps finished (done + skipped) out of total — drives "3 of 6". */
  done: number
  total: number
  /** The step currently being generated, or null when nothing is in flight. */
  currentLabel: string | null
  steps: ProgressStep[]
  startedAt: string
  completedAt: string | null
}

/** The engine's per-program bookkeeping, as persisted in `stages`. */
interface StageShape {
  assets?: string
  briefing?: string
  error?: string
  assetsDone?: string[]
}

/** Registry name, degrading to the raw id rather than throwing on an unknown asset. */
function assetLabel(assetId: string): string {
  try {
    return getAsset(assetId).name
  } catch {
    return assetId
  }
}

/**
 * The Program's assets, or null if the Registry no longer knows it. `activePrograms` is DATA
 * (stored on a confirmed contract), so a Registry change can leave a founder holding an id
 * that no longer resolves — that must not take their whole Command View down with a 500.
 */
function programAssets(templateId: string): readonly string[] | null {
  try {
    return getProgram(templateId).assets
  } catch {
    return null
  }
}

/** The asset steps for one program, in the order the engine generates them. */
function assetSteps(assetIds: readonly string[], templateId: string, stage: StageShape, running: boolean): ProgressStep[] {
  const doneIds = stage.assetsDone ?? []
  let activeTaken = false

  return assetIds.map(assetId => {
    const step = { key: `${templateId}:${assetId}`, label: assetLabel(assetId) }

    if (doneIds.includes(assetId)) {
      // ADR-028: an existing asset with no new founder input isn't regenerated. 'skipped' is
      // honest — 'done' would imply work happened.
      return { ...step, state: stage.assets === 'skipped' ? 'skipped' as const : 'done' as const }
    }
    if (stage.assets === 'failed' && !activeTaken) {
      activeTaken = true // the one that broke; the rest never started
      return { ...step, state: 'failed' as const }
    }
    if (running && stage.assets !== 'failed' && !activeTaken) {
      activeTaken = true
      return { ...step, state: 'active' as const }
    }
    return { ...step, state: 'pending' as const }
  })
}

/** The briefing step — always last for its program, and gated on its assets. */
function briefingStep(templateId: string, stage: StageShape, running: boolean, assetsSettled: boolean): ProgressStep {
  const step = { key: `${templateId}:briefing`, label: 'Executive briefing' }

  if (stage.briefing === 'completed') return { ...step, state: 'done' }
  if (stage.briefing === 'failed') return { ...step, state: 'failed' }
  // 'blocked' means its assets failed so it never ran — pending, not failed.
  if (running && assetsSettled && stage.briefing !== 'blocked') return { ...step, state: 'active' }
  return { ...step, state: 'pending' }
}

/**
 * Project a run into founder-readable progress.
 *
 * @param activeTemplateIds the contract's active Programs, in run order — needed because a
 *        just-created run has an empty `stages` and therefore knows nothing about them yet.
 * @param now injectable for tests; defaults to the real clock.
 */
export function buildProgress(
  run: RhythmRun,
  activeTemplateIds: readonly string[],
  now: number = Date.now(),
): RunProgress {
  const running = run.status === 'running'
  const steps: ProgressStep[] = []

  for (const templateId of activeTemplateIds) {
    const assetIds = programAssets(templateId)
    if (!assetIds) continue // unknown Program — skip it rather than break the whole view
    const stage = (run.stages[templateId] ?? {}) as StageShape
    const assets = assetSteps(assetIds, templateId, stage, running)
    // The briefing only starts once every asset for its program has settled.
    const assetsSettled = assets.every(s => s.state === 'done' || s.state === 'skipped')
    steps.push(...assets, briefingStep(templateId, stage, running, assetsSettled))
  }

  const done = steps.filter(s => s.state === 'done' || s.state === 'skipped').length
  return {
    runId: run.id,
    cycleKey: run.cycleKey,
    status: run.status,
    stalled: running && now - new Date(run.lastStepAt).getTime() > STALE_AFTER_MS,
    failureReason: run.failureReason,
    done,
    total: steps.length,
    currentLabel: steps.find(s => s.state === 'active')?.label ?? null,
    steps,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  }
}
