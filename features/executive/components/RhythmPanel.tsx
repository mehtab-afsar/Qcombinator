'use client'

/**
 * The Operating Rhythm panel (F10) — start a cycle, and watch it run.
 *
 * ⚠️ COMMAND, NOT APPROVAL. "Run now" tells the team to start; it is never a gate on their
 * output. Nothing here approves, reviews or holds work back — see the Command View's own
 * warning. The cycle still runs weekly on its own; this exists so a founder never has to wait
 * a week to see their team work.
 *
 * A cycle is ~5-6 Claude calls over several minutes, executed as separate chained steps, so
 * progress is read from the run record rather than a held-open request. While a cycle is in
 * flight this polls; it stops the moment the run reaches a terminal state (no runaway timer).
 *
 * Client boundary: fetches via /api/rhythm/run and never imports lib/registry|rhythm — the
 * server hands over already-named steps (CLAUDE.md §2, the frontend renders state).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, AlertCircle, Minus, Circle } from 'lucide-react'
import { surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'

interface ProgressStep { key: string; label: string; state: StepState }

interface RunProgress {
  runId: string
  cycleKey: string
  status: 'running' | 'completed' | 'failed'
  stalled: boolean
  failureReason: string | null
  done: number
  total: number
  currentLabel: string | null
  steps: ProgressStep[]
  startedAt: string
  completedAt: string | null
}

/** Matches STEP_LIMIT_EXCEEDED in lib/rhythm/limits.ts — the circuit breaker's reason code. */
const STEP_LIMIT_EXCEEDED = 'step_limit_exceeded'

/** How often to re-read an in-flight cycle. A step is ~90s, so this is responsive but cheap. */
const POLL_MS = 5_000

export function RhythmPanel() {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rhythm/run')
      if (!res.ok) return // a 404 (flag off) or 500 — leave the last good state on screen
      const data = await res.json()
      setProgress(data.progress ?? null)
    } catch {
      /* transient — the next poll retries */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Poll only while a cycle is actually in flight, and always clear on unmount — an interval
  // that outlives its component is the timer-leak class already on the follow-up list.
  const live = progress?.status === 'running' && !progress.stalled
  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => { void load() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [live, load])

  async function startCycle() {
    setBusy(true)
    setError(null)
    try {
      // The body must be valid JSON even though every field is optional — the route validates
      // with Zod via parseBody, which rejects an empty body outright. Sending nothing here
      // returned "Invalid or missing JSON body" and the button silently never worked.
      const res = await fetch('/api/rhythm/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      // 409 = already ran this week (the idempotency guarantee), 400 = no confirmed mandate.
      if (!res.ok) { setError(data.error ?? 'Could not start the cycle.'); return }
      await load()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return null // nothing to say yet; avoids a flash of the empty state

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>This week’s cycle</h2>
        {progress?.status !== 'running' && (
          <button onClick={() => void startCycle()} disabled={busy} style={runBtn(busy)}>
            {busy ? 'Starting…' : 'Run now'}
          </button>
        )}
      </div>

      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}

      {!progress && <Empty />}
      {progress && <StatusLine progress={progress} />}
      {progress && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {progress.steps.map(step => <StepRow key={step.key} step={step} />)}
        </div>
      )}
    </div>
  )
}

function Empty() {
  return (
    <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
      Each cycle your team refreshes your Assets and publishes a briefing. It runs weekly on its
      own — or start one now. It takes a few minutes; you can leave this page.
    </p>
  )
}

/** The one-line headline: what's happening, or what happened. */
function StatusLine({ progress }: { progress: RunProgress }) {
  const { status, stalled, failureReason, done, total, currentLabel } = progress

  if (failureReason === STEP_LIMIT_EXCEEDED) {
    // A tripped run's steps are left exactly as they were, so without this it would read as an
    // unexplained failure. Say what actually happened.
    return (
      <Line color={red}>
        Stopped by the safety limit after {done} of {total} steps — this cycle was taking far more
        work than it should, so it was halted rather than left running. Anything finished is
        saved. This one needs a look before it runs again.
      </Line>
    )
  }
  if (stalled) {
    return (
      <Line color={amber}>
        Stopped partway ({done} of {total} done). Nothing was lost — starting a new cycle picks
        up from here.
      </Line>
    )
  }
  if (status === 'running') {
    return (
      <Line color={blue}>
        {currentLabel ? `Working on ${currentLabel}…` : 'Working…'} ({done} of {total})
      </Line>
    )
  }
  if (status === 'failed') {
    return (
      <Line color={red}>
        Stopped early — {done} of {total} finished. What did complete is saved; running again
        retries the rest.
      </Line>
    )
  }
  return (
    <Line color={green}>
      Finished — {done} of {total} steps. Your briefing is below.
    </Line>
  )
}

function Line({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p style={{ color, fontSize: 14, marginTop: 10, lineHeight: 1.6, maxWidth: 560 }}>{children}</p>
  )
}

function StepRow({ step }: { step: ProgressStep }) {
  const { icon, color, note } = stepLook(step.state)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
      <span style={{ display: 'flex', width: 16 }}>{icon}</span>
      <span style={{ color: step.state === 'pending' ? muted : ink, flex: 1 }}>{step.label}</span>
      {note && <span style={{ color, fontSize: 12 }}>{note}</span>}
    </div>
  )
}

function stepLook(state: StepState): { icon: React.ReactNode; color: string; note: string | null } {
  switch (state) {
    case 'done':
      return { icon: <Check size={15} color={green} />, color: green, note: null }
    case 'active':
      return {
        icon: <Loader2 size={15} color={blue} style={{ animation: 'spin 1s linear infinite' }} />,
        color: blue, note: 'working',
      }
    case 'failed':
      return { icon: <AlertCircle size={15} color={red} />, color: red, note: 'failed' }
    case 'skipped':
      // ADR-028 — no new input, so nothing needed rewriting. Say that, don't imply work.
      return { icon: <Minus size={15} color={muted} />, color: muted, note: 'no change needed' }
    default:
      return { icon: <Circle size={9} color={bdr} />, color: muted, note: null }
  }
}

const card: React.CSSProperties = {
  background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 24, marginTop: 20,
}

const runBtn = (busy: boolean): React.CSSProperties => ({
  background: 'none', color: ink, border: `1px solid ${bdr}`, borderRadius: 8,
  padding: '8px 16px', fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
})
