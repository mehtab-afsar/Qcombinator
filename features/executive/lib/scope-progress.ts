/**
 * Narrow a whole-company cycle's steps to one executive's, recomputing done/total/currentLabel
 * from the filtered set — the numbers must describe what's actually shown, not the whole cycle's
 * progress next to a partial step list.
 *
 * Deliberately client-only and structurally typed against a minimal shape, not imported from
 * lib/rhythm/progress.ts — RhythmPanel.tsx's own docstring is explicit that this client boundary
 * "never imports lib/registry|rhythm," so the two client components that need this (RhythmPanel,
 * BirdsEyeStats) share ONE small copy here instead of each re-deriving the same filter.
 */

export interface ScopableStep {
  executiveId: string | null
  state: 'done' | 'active' | 'pending' | 'failed' | 'skipped'
  label: string
}

export function scopeStepsToExecutive<T extends ScopableStep>(
  steps: readonly T[],
  executiveId: string,
): { steps: T[]; done: number; total: number; currentLabel: string | null } {
  const scoped = steps.filter(s => s.executiveId === executiveId)
  return {
    steps: scoped,
    done: scoped.filter(s => s.state === 'done' || s.state === 'skipped').length,
    total: scoped.length,
    currentLabel: scoped.find(s => s.state === 'active')?.label ?? null,
  }
}

export interface ScopableStepWithKind extends ScopableStep {
  kind: 'asset' | 'briefing' | 'action'
}

/**
 * PRD 2 — "documents" (Assets + the Briefing) as their own progress view, excluding Actions.
 * Actions already have a dedicated, better surface (ActionsPanel: approve/decline, "waiting on
 * you", expandable analysis) — folding them into one generic step count reads as "12 documents,"
 * which they are not (P001 is 5 Assets + 1 Briefing + 6 Actions; the founder should never have to
 * do that arithmetic themselves). `finished` is derived from THIS narrower scope, not the
 * server's whole-run status: once every document/briefing step is done, that reads as finished
 * to a founder even if the run is still working through Actions behind the scenes.
 */
export function documentProgress<T extends ScopableStepWithKind>(
  steps: readonly T[],
): { steps: T[]; done: number; total: number; currentLabel: string | null; finished: boolean } {
  const docSteps = steps.filter(s => s.kind !== 'action')
  const done = docSteps.filter(s => s.state === 'done' || s.state === 'skipped').length
  return {
    steps: docSteps,
    done,
    total: docSteps.length,
    currentLabel: docSteps.find(s => s.state === 'active')?.label ?? null,
    finished: docSteps.length > 0 && done === docSteps.length,
  }
}
