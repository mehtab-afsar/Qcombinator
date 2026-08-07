'use client'

/**
 * CANVAS_SPEC §4.2 — Bird's-eye stats: "this cycle's activity · how many actions wait on the
 * founder · when it last ran." The pilot's-vision glance.
 *
 * Deliberately THREE tiles, not four. The spec's own 4th ("the owned dimension + trend") would
 * need a clean executive→Q-Score-param mapping that doesn't exist yet (see ExecutiveRead.tsx's
 * docstring and the plan for this build) — shipping 3 honest tiles beats 1 fabricated one.
 *
 * Client boundary, same as RhythmPanel/ActionsPanel: self-fetches, never imports lib/rhythm or
 * lib/registry — local types mirror the API shape rather than importing server types.
 */

import { useEffect, useState } from 'react'
import { ink, muted, bdr, bg, amber } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { scopeStepsToExecutive, type ScopableStep } from '../lib/scope-progress'

interface Step extends ScopableStep {
  key: string
}

interface Progress {
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  steps: Step[]
}

interface PendingAction {
  executiveId?: string | null
}

export function BirdsEyeStats({ executiveId }: { executiveId: string }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [runRes, actionRes] = await Promise.all([fetch('/api/rhythm/run'), fetch('/api/actions')])
        if (!live) return
        if (runRes.ok) setProgress((await runRes.json()).progress ?? null)
        if (actionRes.ok) {
          const pending: PendingAction[] = (await actionRes.json()).pending ?? []
          setPendingCount(pending.filter(a => a.executiveId === executiveId).length)
        }
      } catch {
        /* leave the last good state — this is a glance, not the source of truth */
      } finally {
        setLoaded(true)
      }
    })()
    return () => { live = false }
  }, [executiveId])

  if (!loaded || !progress) return null

  const scoped = scopeStepsToExecutive(progress.steps, executiveId)
  const lastRan = progress.completedAt ?? (progress.status === 'running' ? progress.startedAt : null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      <Tile label="This cycle" value={`${scoped.done} of ${scoped.total}`} />
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
