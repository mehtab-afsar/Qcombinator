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
import { Check, Loader2, AlertCircle, Minus, Circle, ChevronDown } from 'lucide-react'
import { bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'

interface ProgressStep {
  key: string
  label: string
  state: StepState
  /** Registry Program id, e.g. 'P001' — was smuggled inside `key` as an unstructured prefix
   *  until the Command View redesign needed a real field to filter on. */
  templateId: string
  executiveId: string | null
}

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

/** F09 artifact organization — one past cycle, thin (GET /api/rhythm/run's `history` array). */
interface RunSummary {
  id: string
  cycleKey: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  done: number
  total: number
}

/** Matches STEP_LIMIT_EXCEEDED in lib/rhythm/limits.ts — the circuit breaker's reason code. */
const STEP_LIMIT_EXCEEDED = 'step_limit_exceeded'

/** How often to re-read an in-flight cycle. A step is ~90s, so this is responsive but cheap. */
const POLL_MS = 5_000

/**
 * @param executiveId scope the step list (and its done/total counts) to one executive's steps —
 *   the detail page. "Run now" still starts the WHOLE weekly cycle regardless (there is no way to
 *   run one Program in isolation — CLAUDE.md §1: no runsWhen/event-skipping in v1); only the
 *   display narrows, not the actual trigger.
 */
export function RhythmPanel({ executiveId }: { executiveId?: string } = {}) {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [history, setHistory] = useState<RunSummary[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
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
      setHistory(data.history ?? [])
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

  // Narrow to one executive's steps for the detail page — recompute done/total/currentLabel
  // from the filtered set so the numbers on screen describe what's actually shown, not the
  // whole cycle's progress next to a partial step list.
  const scoped = progress && executiveId
    ? {
        ...progress,
        steps: progress.steps.filter(s => s.executiveId === executiveId),
        done: progress.steps.filter(s => s.executiveId === executiveId && (s.state === 'done' || s.state === 'skipped')).length,
        total: progress.steps.filter(s => s.executiveId === executiveId).length,
        currentLabel: progress.steps.find(s => s.executiveId === executiveId && s.state === 'active')?.label ?? null,
      }
    : progress

  return (
    <SectionCard
      title="This week's cycle"
      action={progress?.status !== 'running' && (
        <Button variant="secondary" size="sm" loading={busy} onClick={() => void startCycle()}>
          Run now
        </Button>
      )}
    >
      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}

      {!scoped && <Empty />}
      {scoped && <StatusLine progress={scoped} />}
      {scoped && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {scoped.steps.map(step => <StepRow key={step.key} step={step} />)}
        </div>
      )}

      {/* F09 artifact organization — "Past cycles." Only appears once there IS a past to show;
          a founder on their first cycle sees nothing new here. A cycle is whole-company by
          design (ADR-008 — every contract-active Program runs together), so this isn't scoped
          to `executiveId` the way the step list above is. */}
      {history.length > 1 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${bdr}` }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              padding: 0, cursor: 'pointer', color: muted, fontSize: 12, fontFamily: 'inherit',
              textTransform: 'uppercase', letterSpacing: 0.4,
            }}
          >
            Past cycles
            <ChevronDown
              size={12}
              style={{ transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            />
          </button>
          {historyOpen && (
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              {history.filter(h => h.id !== progress?.runId).map(h => <HistoryRow key={h.id} run={h} />)}
            </div>
          )}
        </div>
      )}
    </SectionCard>
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

function HistoryRow({ run }: { run: RunSummary }) {
  const color = run.status === 'completed' ? green : run.status === 'failed' ? red : amber
  const label = run.status === 'completed' ? 'Finished' : run.status === 'failed' ? 'Stopped early' : 'Running'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ color: ink, flex: 1 }}>{new Date(run.startedAt).toLocaleDateString()}</span>
      <span style={{ color, fontSize: 12 }}>{label} · {run.done} of {run.total}</span>
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
