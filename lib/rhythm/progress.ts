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

import { getProgram, getAsset, getAction } from '@/lib/registry'
import { STALE_AFTER_MS, type RhythmRun, type RunStatus } from './runs'

export type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'

export interface ProgressStep {
  /** Stable key for React, e.g. 'P001:AS001' or 'P001:briefing'. */
  key: string
  /** What the founder reads, e.g. 'ICP Profiles' — resolved from the Registry. */
  label: string
  state: StepState
  /** The Registry Program id this step belongs to — e.g. 'P001'. Was smuggled inside `key` as an
   *  unstructured prefix; a consumer had to string-split it. Surfaced as its own field so the
   *  Command View can group/filter steps by Program without parsing a React key. */
  templateId: string
  /** The Program's owning Executive — e.g. 'growth' — or null if the Registry no longer knows
   *  this Program (mirrors programOrNull's fail-open: an unresolvable id must not 500 the view). */
  executiveId: string | null
  /** What kind of work this step represents — lets a consumer (Activation) react to an asset
   *  landing without parsing `key`, which RhythmPanel is documented to never do. */
  kind: 'asset' | 'briefing' | 'action'
  /** The Registry asset id this step produced — asset steps only. Lets Activation fetch the
   *  real, just-persisted content the moment the step flips to 'done' without string-splitting
   *  `key` (the thing this field exists specifically to avoid). */
  assetId: string | null
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
  /** F14. Absent on runs that predate Actions — every read defaults, as the engine does. */
  actions?: string
  actionsDone?: string[]
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
function programOrNull(templateId: string): { assets: readonly string[]; actions: readonly string[]; owner: string } | null {
  try {
    const program = getProgram(templateId)
    return { assets: program.assets, actions: program.actions, owner: program.owner }
  } catch {
    return null
  }
}

/** The asset steps for one program, in the order the engine generates them. */
function assetSteps(assetIds: readonly string[], templateId: string, executiveId: string | null, stage: StageShape, running: boolean): ProgressStep[] {
  const doneIds = stage.assetsDone ?? []
  let activeTaken = false

  return assetIds.map(assetId => {
    const step = { key: `${templateId}:${assetId}`, label: assetLabel(assetId), templateId, executiveId, kind: 'asset' as const, assetId }

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
function briefingStep(templateId: string, executiveId: string | null, stage: StageShape, running: boolean, assetsSettled: boolean): ProgressStep {
  const step = { key: `${templateId}:briefing`, label: 'Executive briefing', templateId, executiveId, kind: 'briefing' as const, assetId: null }

  if (stage.briefing === 'completed') return { ...step, state: 'done' }
  if (stage.briefing === 'failed') return { ...step, state: 'failed' }
  // 'blocked' means its assets failed so it never ran — pending, not failed.
  if (running && assetsSettled && stage.briefing !== 'blocked') return { ...step, state: 'active' }
  return { ...step, state: 'pending' }
}

/** Registry name for an Action, degrading to the raw id rather than throwing. */
function actionLabel(actionId: string): string {
  try {
    return getAction(actionId).name
  } catch {
    return actionId
  }
}

/**
 * The Action steps for one program — the phase that runs after the briefing.
 *
 * Without these the panel would count only assets + briefing, so it would read "6 of 6 —
 * Finished" while the engine was still generating Actions, and `currentLabel` would go null
 * mid-run. A progress bar that lies about being done is worse than none.
 */
function actionSteps(
  actionIds: readonly string[],
  templateId: string,
  executiveId: string | null,
  stage: StageShape,
  running: boolean,
  briefingSettled: boolean,
): ProgressStep[] {
  // Defaulted exactly as the engine defaults them: a run created before Actions shipped has no
  // `actions` key, and treating that as "not pending" would hide the phase entirely.
  const status = stage.actions ?? 'pending'
  const doneIds = stage.actionsDone ?? []
  let activeTaken = false

  return actionIds.map(actionId => {
    const step = { key: `${templateId}:${actionId}`, label: actionLabel(actionId), templateId, executiveId, kind: 'action' as const, assetId: null }

    if (doneIds.includes(actionId)) return { ...step, state: 'done' as const }
    if (status === 'failed' && !activeTaken) {
      activeTaken = true
      return { ...step, state: 'failed' as const }
    }
    // Actions only begin once the briefing has settled — the engine's own phase order.
    if (running && briefingSettled && status !== 'failed' && !activeTaken) {
      activeTaken = true
      return { ...step, state: 'active' as const }
    }
    return { ...step, state: 'pending' as const }
  })
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
    const program = programOrNull(templateId)
    if (!program) continue // unknown Program — skip it rather than break the whole view
    const stage = (run.stages[templateId] ?? {}) as StageShape
    const executiveId = program.owner

    const assets = assetSteps(program.assets, templateId, executiveId, stage, running)
    // The briefing only starts once every asset for its program has settled.
    const assetsSettled = assets.every(s => s.state === 'done' || s.state === 'skipped')
    const briefing = briefingStep(templateId, executiveId, stage, running, assetsSettled)
    // …and Actions only start once the briefing has (the engine's phase order, mirrored).
    const briefingSettled = briefing.state === 'done'
    steps.push(...assets, briefing, ...actionSteps(program.actions, templateId, executiveId, stage, running, briefingSettled))
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
