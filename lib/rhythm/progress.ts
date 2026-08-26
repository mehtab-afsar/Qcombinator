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

import { getProgram } from '@/lib/registry'
import { assetLabel, actionLabel } from '@/lib/registry/labels'
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
  /** The Registry action id this step attempted — action steps only. Same reasoning as
   *  assetId: lib/rhythm/preview.ts needs it to look up this step's action_log entry
   *  without parsing `key`. */
  actionId: string | null
  /** A short, real snippet of what this step actually produced — the asset's own
   *  content, the briefing's verdict, or the action's redacted metadata — set by
   *  lib/rhythm/preview.ts for the live run only (never recomputed for history).
   *  null until the step is done/skipped, or when no preview could be built. */
  preview: string | null
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

/**
 * The ONE unit of work the engine will do next — or null when nothing is in flight.
 *
 * ⚠️ This exists because 'active' is a property of the RUN, not of a program. It used to be
 * decided per-program (a local `activeTaken` flag inside each step builder, gated on the
 * run-level `running`), which meant the first unfinished asset of EVERY active program was
 * marked active at once. The engine generates exactly one asset per pass and returns
 * (lib/rhythm/run.ts's runNextStep), so all but one of those were fiction — and because the
 * live-text column was equally unowned, every executive's tab rendered the one genuinely
 * running program's text under its own document's name.
 *
 * Mirrors runNextStep's own scan order exactly: programs in the caller's order, and within a
 * program assets → briefing → actions, skipping past a phase that failed or was blocked.
 * If the two ever disagree the panel points at the wrong step, so `activeTemplateIds` and the
 * engine's program order must be the same order — see orderPrograms in lib/rhythm/context.ts.
 */
export interface CurrentWork {
  templateId: string
  kind: 'asset' | 'briefing' | 'action'
  /** The Registry id of the specific asset/action — null for a briefing, which has no id. */
  id: string | null
}

export function currentWork(
  activeTemplateIds: readonly string[],
  stages: Record<string, StageShape>,
): CurrentWork | null {
  for (const templateId of activeTemplateIds) {
    const program = programOrNull(templateId)
    if (!program) continue // unknown Program — skipped without consuming the cursor
    const stage = stages[templateId] ?? {}

    if (stage.assets === 'failed') continue // its briefing is 'blocked'; the engine moved on
    const nextAsset = program.assets.find(id => !(stage.assetsDone ?? []).includes(id))
    // The status guard mirrors the engine: once assets are completed/skipped no asset is next,
    // even if assetsDone is short (ADR-028 can settle a phase without touching every id).
    if (nextAsset && (stage.assets ?? 'pending') === 'pending') {
      return { templateId, kind: 'asset', id: nextAsset }
    }

    if (stage.briefing === 'failed' || stage.briefing === 'blocked') continue
    if ((stage.briefing ?? 'pending') === 'pending') return { templateId, kind: 'briefing', id: null }

    const actions = stage.actions ?? 'pending'
    if (actions === 'failed' || actions === 'blocked') continue
    if (actions === 'pending') {
      const nextAction = program.actions.find(id => !(stage.actionsDone ?? []).includes(id))
      if (nextAction) return { templateId, kind: 'action', id: nextAction }
    }
  }
  return null
}

/** Does the run-wide cursor point at exactly this step? */
function isCurrent(current: CurrentWork | null, templateId: string, kind: CurrentWork['kind'], id: string | null): boolean {
  return current !== null && current.templateId === templateId && current.kind === kind && current.id === id
}

/** The asset steps for one program, in the order the engine generates them. */
function assetSteps(assetIds: readonly string[], templateId: string, executiveId: string | null, stage: StageShape, current: CurrentWork | null): ProgressStep[] {
  const doneIds = stage.assetsDone ?? []
  let failedTaken = false

  return assetIds.map(assetId => {
    const step = { key: `${templateId}:${assetId}`, label: assetLabel(assetId), templateId, executiveId, kind: 'asset' as const, assetId, actionId: null, preview: null }

    if (doneIds.includes(assetId)) {
      // ADR-028: an existing asset with no new founder input isn't regenerated. 'skipped' is
      // honest — 'done' would imply work happened.
      return { ...step, state: stage.assets === 'skipped' ? 'skipped' as const : 'done' as const }
    }
    // Still per-program: 'failed' is read off this program's own stage, not the run cursor.
    if (stage.assets === 'failed' && !failedTaken) {
      failedTaken = true // the one that broke; the rest never started
      return { ...step, state: 'failed' as const }
    }
    if (isCurrent(current, templateId, 'asset', assetId)) return { ...step, state: 'active' as const }
    return { ...step, state: 'pending' as const }
  })
}

/** The briefing step — always last for its program, and gated on its assets. */
function briefingStep(templateId: string, executiveId: string | null, stage: StageShape, current: CurrentWork | null): ProgressStep {
  const step = { key: `${templateId}:briefing`, label: 'Executive briefing', templateId, executiveId, kind: 'briefing' as const, assetId: null, actionId: null, preview: null }

  if (stage.briefing === 'completed') return { ...step, state: 'done' }
  if (stage.briefing === 'failed') return { ...step, state: 'failed' }
  // 'blocked' means its assets failed so it never ran — pending, not failed. currentWork skips
  // past a blocked briefing for the same reason, so this can never be the cursor's target.
  if (isCurrent(current, templateId, 'briefing', null)) return { ...step, state: 'active' }
  return { ...step, state: 'pending' }
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
  current: CurrentWork | null,
): ProgressStep[] {
  // Defaulted exactly as the engine defaults them: a run created before Actions shipped has no
  // `actions` key, and treating that as "not pending" would hide the phase entirely.
  const status = stage.actions ?? 'pending'
  const doneIds = stage.actionsDone ?? []
  let failedTaken = false

  return actionIds.map(actionId => {
    const step = { key: `${templateId}:${actionId}`, label: actionLabel(actionId), templateId, executiveId, kind: 'action' as const, assetId: null, actionId, preview: null }

    if (doneIds.includes(actionId)) return { ...step, state: 'done' as const }
    if (status === 'failed' && !failedTaken) {
      failedTaken = true
      return { ...step, state: 'failed' as const }
    }
    // The phase gate (actions only begin once the briefing has settled) now lives in
    // currentWork, which walks the engine's real order rather than re-deriving it here.
    if (isCurrent(current, templateId, 'action', actionId)) return { ...step, state: 'active' as const }
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

  // The single place `running` is consulted. Deliberately NOT gated on `stalled` as well: a
  // stalled run must keep showing which step it died on, which is the whole diagnostic.
  const current = running
    ? currentWork(activeTemplateIds, run.stages as Record<string, StageShape>)
    : null

  for (const templateId of activeTemplateIds) {
    const program = programOrNull(templateId)
    if (!program) continue // unknown Program — skip it rather than break the whole view
    const stage = (run.stages[templateId] ?? {}) as StageShape
    const executiveId = program.owner

    steps.push(
      ...assetSteps(program.assets, templateId, executiveId, stage, current),
      briefingStep(templateId, executiveId, stage, current),
      ...actionSteps(program.actions, templateId, executiveId, stage, current),
    )
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
