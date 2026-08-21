'use client'

/**
 * CANVAS_SPEC §4.2 — Bird's-eye stats: "this cycle's activity · how many actions wait on the
 * founder · when it last ran." The pilot's-vision glance.
 *
 * Deliberately THREE tiles, not four. The spec's own 4th ("the owned dimension + trend") would
 * need a clean executive→Q-Score-param mapping that doesn't exist yet (see ExecutiveRead.tsx's
 * docstring and the plan for this build) — shipping 3 honest tiles beats 1 fabricated one.
 *
 * Client boundary, same as RhythmPanel/ActionsPanel: never imports lib/rhythm or lib/registry.
 * Takes the already-shared `rhythm` state (useRhythmProgress, lifted once by the page) as a prop
 * instead of independently re-fetching /api/rhythm/run — the same pattern RhythmPanel itself
 * uses. Pending-action count comes from the shared ExecutiveWorkspaceProvider.
 */

import { ink, muted, bdr, bg, amber } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import type { RhythmProgressState } from '../hooks/useRhythmProgress'

export function BirdsEyeStats({ executiveId, rhythm }: { executiveId: string; rhythm: RhythmProgressState }) {
  const { actions: { pending } } = useExecutiveWorkspace()
  const { progress, loaded } = rhythm
  const pendingCount = pending.filter(a => a.executiveId === executiveId).length

  if (!loaded || !progress) return null

  // Documents (Assets + the Briefing), not the whole 12-step run — Actions already get their own
  // tile below. See documentProgress's docstring (RhythmPanel's "This week's cycle" has the same
  // fix, for the same reason).
  const scoped = scopeStepsToExecutive(progress.steps, executiveId)
  const docs = documentProgress(scoped.steps)
  const lastRan = progress.completedAt ?? (progress.status === 'running' ? progress.startedAt : null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      <Tile label="This cycle" value={`${docs.done} of ${docs.total}`} />
      <Tile label="Waiting on you" value={String(pendingCount)} highlight={pendingCount > 0} />
      <Tile label="Last ran" value={lastRan ? new Date(lastRan).toLocaleDateString() : '—'} />
    </div>
  )
}

function Tile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${highlight ? amber : bdr}`, borderRadius: radius.md,
      padding: '12px 14px',
    }}>
      <p style={{ color: ink, fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{value}</p>
      <p style={{ color: muted, fontSize: 12, margin: '4px 0 0' }}>{label}</p>
    </div>
  )
}
