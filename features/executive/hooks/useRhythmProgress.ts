'use client'

/**
 * The Operating Rhythm's live state — extracted out of RhythmPanel.tsx so it can be shared with
 * AssetWorkspacePanel (watch a document write itself live, in the same panel it's read in),
 * without opening a second, independent Realtime subscription for the same run. Call this ONCE,
 * in the page that owns both RhythmPanel and the asset-open state
 * (app/founder/executive/[executiveId]/page.tsx) — RhythmPanel now takes this as props instead
 * of fetching/subscribing itself; its own rendering is unchanged.
 *
 * Two streaming sources, composed exactly as RhythmPanel always did: `useStreamedRhythmStep`'s
 * SSE covers the founder's own "Run now" click, step 1 only; the Supabase Realtime subscription
 * on this run's `streaming_text` covers everything else. `activeLive` picks whichever applies —
 * the same ternary RhythmPanel's own render always did, now shared rather than duplicated.
 *
 * Both sources carry the ID OF THE ASSET that produced the text, never a bare string: a run
 * spans every executive's Programs, so unowned live text is text every tab renders as its own.
 * See live-stream.ts, which owns that type and the two predicates for reading it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStreamedRhythmStep } from './useStreamedRhythmStep'
import { POLL_MS, isCycleLive } from '../lib/useCycleLive'
import { createClient } from '@/lib/supabase/client'
import type { LiveStream } from './live-stream'
import type { ProgressStep, RunProgress, RunSummary } from '../components/RhythmPanel'

/** How many times to auto-resume a single stalled run before giving up and leaving the existing
 *  manual "stalled — click Resume" UI as the fallback. Safe to be generous now that a
 *  stale-but-running resume genuinely continues in place (lib/rhythm/runs.ts) rather than
 *  silently duplicating a briefing or Actions — the only real cost of a wasted attempt is
 *  re-attempting whichever one step was mid-flight when the chain broke, not the whole run. */
const AUTO_RESUME_CAP = 3

/** Pure — unit-tested directly (this repo has no hook-rendering test library; see
 *  useAutoOpenLiveAsset.ts's activeAssetIdFor for the same convention). */
export function shouldAutoResume(attempts: number, cap: number = AUTO_RESUME_CAP): boolean {
  return attempts < cap
}

export function useRhythmProgress() {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [history, setHistory] = useState<RunSummary[]>([])
  const [loaded, setLoaded] = useState(false)
  const { streaming, stream: sseStream, error, run: runStreamedStep } = useStreamedRhythmStep()
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rhythm/run')
      if (!res.ok) return // a 404 (flag off) or 500 — leave the last good state on screen
      const data = await res.json()
      setProgress(data.progress ?? null)
      setHistory(data.history ?? [])
    } catch {
      /* transient — the next poll retries */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const live = isCycleLive(progress)
  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => { void load() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [live, load])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [live])

  const runId = progress?.runId ?? null
  // null rather than an empty stream — see live-stream.ts. Realtime hands us the whole new row,
  // so both columns always arrive together and can never be paired across two events.
  const [realtime, setRealtime] = useState<LiveStream | null>(null)
  useEffect(() => {
    setRealtime(null)
    if (!live || !runId) return
    let supabase: ReturnType<typeof createClient>
    let channel: ReturnType<ReturnType<typeof createClient>['channel']>
    try {
      supabase = createClient()
      channel = supabase
        .channel(`operating_rhythm_runs:${runId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'operating_rhythm_runs', filter: `id=eq.${runId}` },
          payload => {
            const row = payload.new as { streaming_text: string | null; streaming_asset_id: string | null }
            // Null text clears the stream outright — that is what makes the writer's finish()
            // land on the client too, rather than leaving the last step's words on screen.
            setRealtime(row.streaming_text ? { text: row.streaming_text, assetId: row.streaming_asset_id } : null)
          },
        )
        .subscribe()
    } catch {
      /* Realtime unavailable — the settled reveal still lands from the ordinary poll */
    }
    return () => {
      try { if (channel) supabase.removeChannel(channel) } catch { /* ignore */ }
    }
  }, [live, runId])

  async function startCycle(): Promise<void> {
    const result = await runStreamedStep()
    if (result) await load()
  }

  // Auto-resume a stalled run, capped per runId — the founder's own "click Resume" turned
  // automatic. Note polling itself already stops the moment `stalled` is true (isCycleLive
  // returns false), so this effect only ever fires once per genuine stall-detection, not
  // repeatedly while stalled; a successful resume's own `load()` (inside startCycle) is what
  // produces the next progress snapshot, resuming polling if it actually helped.
  const autoResumeAttempts = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!progress?.stalled || !runId) return
    const attempts = autoResumeAttempts.current[runId] ?? 0
    if (!shouldAutoResume(attempts)) return
    autoResumeAttempts.current[runId] = attempts + 1
    void startCycle()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startCycle intentionally excluded: it closes over `progress`/`runStreamedStep` and is recreated every render, which would re-fire this on every unrelated re-render instead of only on a genuine stall transition
  }, [progress?.stalled, runId])

  /** Whichever source applies right now — the SSE stream during the founder's own click,
   *  Realtime otherwise. Same logic RhythmPanel's render always used, shared here so a second
   *  consumer (the auto-opening document panel) doesn't have to re-derive it. */
  const activeLive: LiveStream | null = streaming ? sseStream : realtime

  /** The one step currently `active`, if any — across every Program, unscoped. Callers that
   *  care about one executive/program should filter `progress.steps` themselves first (the
   *  same `scopeStepsToExecutive`/programTemplateId narrowing RhythmPanel already does). */
  const activeStep: ProgressStep | null = progress?.steps.find(s => s.state === 'active') ?? null

  return {
    progress, history, loaded, live, now, error, streaming,
    sseStream, realtime, activeLive, activeStep,
    startCycle, reload: load,
  }
}

export type RhythmProgressState = ReturnType<typeof useRhythmProgress>
