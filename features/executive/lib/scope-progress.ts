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
