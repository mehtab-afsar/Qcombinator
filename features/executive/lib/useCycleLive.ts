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
 *  - `useCycleLive()` (a hook) — for BriefingsPanel/ActionsPanel/the shared workspace, which have
 *    no other reason to fetch /api/rhythm/run. It runs its own lightweight poll and exposes a
 *    `generation` counter, so a consumer can re-run its own `load()` without re-deriving when to.
 *
 * `generation` increments when the cycle starts or ends AND when any step lands. It used to move
 * only on the live transition, which meant a panel keyed to it went stale for the whole run: a
 * founder watched the step list tick past six finished documents while the Documents panel beside
 * it still read "Not generated yet" for three of them.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** How often to re-read an in-flight cycle. A step is ~90s, so this is responsive but cheap.
 *  The one definition — RhythmPanel used to redefine this locally. */
export const POLL_MS = 5_000

interface RunProgress {
  status: 'running' | 'completed' | 'failed'
  stalled: boolean
  /** Steps finished (done + skipped). The signal that a NEW document just landed. Optional
   *  because `isCycleLive` neither needs nor asks for it — liveness is status + stalled, and a
   *  caller answering only that question shouldn't have to supply a count it doesn't have. */
  done?: number
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
 * What a consumer would want to re-read for, as one comparable value: the cycle started or
 * ended, OR another step landed. null means "nothing known yet" — distinct from any real
 * reading, so the first poll establishes a baseline rather than counting as a change.
 *
 * Pure, and unit-tested directly (this repo has no hook-rendering library — same convention as
 * isCycleLive above and shouldAutoResume in useRhythmProgress).
 */
export function cycleSignature(progress: RunProgress | null): string | null {
  if (progress?.done == null) return null
  return `${isCycleLive(progress)}:${progress.done}`
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
  // Before `done` was part of this, `generation` moved only on the live transition, so a panel
  // keyed to it stayed frozen for the entire ~11-minute run — which is how a founder came to be
  // shown "Not generated yet" beside documents that had long since been written. This poll was
  // already running; only what counts as a change is new.
  const signature = cycleSignature(progress)
  const prevSignature = useRef<string | null>(null)

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

  // Bump `generation` on a live transition (cycle start OR finish) or on a step landing — a
  // consumer keying its own load() off this, alongside its existing mount-time fetch, sees fresh
  // data the moment a cycle it didn't itself trigger (another tab, the weekly cron) moves.
  useEffect(() => {
    if (signature === null) return // nothing read yet — a consumer's own mount fetch covers this
    // The first real reading establishes the baseline WITHOUT bumping: consumers already fetch
    // on mount, and bumping here would make every one of them immediately do it again.
    if (prevSignature.current === null) { prevSignature.current = signature; return }
    if (prevSignature.current !== signature) {
      prevSignature.current = signature
      setGeneration(g => g + 1)
    }
  }, [signature])

  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => { void poll() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [live, poll])

  return { live, generation }
}
