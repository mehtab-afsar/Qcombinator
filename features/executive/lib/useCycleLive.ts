'use client'

/**
 * "Is a cycle currently live?" — extracted from RhythmPanel.tsx so BriefingsPanel/ActionsPanel
 * don't invent a second copy (CLAUDE.md "no duplicated logic") and so the polling cadence has
 * exactly one definition (CLAUDE.md "no value defined in three places").
 *
 * Two shapes are exported on purpose, not one hook everyone calls:
 *  - `isCycleLive` + `POLL_MS` (pure) — for RhythmPanel, which already fetches the full progress
 *    object itself (it needs the per-step detail, not just the flag). Importing the pure check
 *    avoids a second, redundant poller inside the same component hitting the same endpoint.
 *  - `useCycleLive()` (a hook) — for BriefingsPanel/ActionsPanel, which have no other reason to
 *    fetch /api/rhythm/run. It runs its own lightweight poll and exposes a `generation` counter
 *    that increments exactly when `live` flips, so a consumer can re-run its own `load()` on
 *    that transition without re-deriving the transition itself.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** How often to re-read an in-flight cycle. A step is ~90s, so this is responsive but cheap.
 *  The one definition — RhythmPanel used to redefine this locally. */
export const POLL_MS = 5_000

interface RunProgress {
  status: 'running' | 'completed' | 'failed'
  stalled: boolean
}

/**
 * Pure — the actual liveness rule, unit-tested directly (same pattern as isActivating in
 * useActivationCheck.ts). FU-010: a run whose self-chain died server-side still reports
 * status:'running', so `stalled` is what tells a genuinely in-flight cycle apart from one that
 * needs a fresh "Run now" click — both must be checked, not just `status`.
 */
export function isCycleLive(progress: RunProgress | null): boolean {
  return progress?.status === 'running' && !progress.stalled
}

/**
 * Self-polling version of the same check, for a component with no other reason to read
 * /api/rhythm/run. Fetches once on mount, then polls every POLL_MS only while live — identical
 * shape to RhythmPanel's own effect, so this stops itself the moment the run reaches a terminal
 * state (no runaway timer).
 */
export function useCycleLive(): { live: boolean; generation: number } {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [generation, setGeneration] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const live = isCycleLive(progress)
  const prevLive = useRef(live)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/rhythm/run')
      if (!res.ok) return // a 404 (flag off) or 500 — leave the last good state
      const data = await res.json()
      setProgress(data.progress ?? null)
    } catch {
      /* transient — the next poll retries */
    }
  }, [])

  useEffect(() => { void poll() }, [poll])

  // Bump `generation` exactly on a live transition (cycle start OR finish) — a consumer keying
  // its own load() off this, alongside its existing mount-time fetch, sees fresh data the moment
  // a cycle it didn't itself trigger (another tab, the weekly cron) finishes.
  useEffect(() => {
    if (live !== prevLive.current) {
      prevLive.current = live
      setGeneration(g => g + 1)
    }
  }, [live])

  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => { void poll() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [live, poll])

  return { live, generation }
}
