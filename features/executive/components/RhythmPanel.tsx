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
import { motion } from 'framer-motion'
import { Check, Loader2, AlertCircle, Minus, Circle, ChevronDown, FileText, MessageSquare, Send } from 'lucide-react'
import { bdr, ink, muted, blue, green, amber, red, alpha } from '@/lib/constants/colors'
import { ease } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import { useStreamedRhythmStep } from '../hooks/useStreamedRhythmStep'
import { POLL_MS, isCycleLive } from '../lib/useCycleLive'

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'
type StepKind = 'asset' | 'briefing' | 'action'

interface ProgressStep {
  key: string
  label: string
  state: StepState
  /** Registry Program id, e.g. 'P001' — was smuggled inside `key` as an unstructured prefix
   *  until the Command View redesign needed a real field to filter on. */
  templateId: string
  executiveId: string | null
  /** What kind of work this step is — an asset being written, the briefing, or an action —
   *  drives the small kind icon next to the label so the list reads as more than one
   *  undifferentiated checklist (PRD §3). */
  kind: StepKind
  /** A short real snippet of what this step produced, once done/skipped — see
   *  lib/rhythm/preview.ts. null while in flight, or when no preview could be built. */
  preview: string | null
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
  const { streaming, liveText, error, run: runStreamedStep } = useStreamedRhythmStep()
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
  const live = isCycleLive(progress)
  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => { void load() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [live, load])

  // PRD 2 Stage 2 Part A — streams step 1's asset content live via SSE (useStreamedRhythmStep);
  // the hook owns its own busy/error state, including the 409/400 "already ran"/"no mandate"
  // cases (real JSON, resolved before the stream opens — see the route's own comment).
  async function startCycle() {
    const result = await runStreamedStep()
    if (result) await load()
  }

  if (!loaded) return null // nothing to say yet; avoids a flash of the empty state

  // Narrow to one executive's steps for the detail page — see scopeStepsToExecutive's own
  // docstring for why this is shared (with BirdsEyeStats) rather than a second copy of the filter.
  const scoped = progress && executiveId
    ? { ...progress, ...scopeStepsToExecutive(progress.steps, executiveId) }
    : progress

  // Documents (Assets + the Briefing), separate from Actions — Actions already have their own
  // surface below (ActionsPanel). Without this, "This week's cycle" reads as "12 documents" when
  // it's really 5 documents, 1 briefing, and 6 actions — see documentProgress's own docstring.
  const docs = scoped ? documentProgress(scoped.steps) : null

  // FU-010: a run whose self-chain died server-side still has status:'running' — this button
  // used to hide (progress.status !== 'running') for exactly the case a founder most needs it,
  // leaving the "starting a new cycle picks up from here" copy below with nothing on screen
  // that does that. `startCycle` already calls the same POST /api/rhythm/run that correctly
  // resumes a stale run (lib/rhythm/runs.ts's createOrResumeRun) — this was a visibility bug,
  // not a missing capability.
  return (
    <SectionCard
      title="This week's cycle"
      style={{ background: alpha(amber, 0.04) }}
      action={(progress?.status !== 'running' || progress?.stalled) && (
        <Button variant="secondary" size="sm" loading={streaming} onClick={() => void startCycle()}>
          {progress?.stalled ? 'Resume' : 'Run now'}
        </Button>
      )}
    >
      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}

      {streaming ? (
        // The founder's own click — the one request their browser is actually connected to
        // (see judge.ts's onDelta comment). Stale progress from a prior run is hidden rather
        // than shown alongside this, to avoid implying it's what's updating live; `load()`
        // replaces this with the real, settled step list the moment the stream ends.
        <StreamingRow text={liveText} />
      ) : (
        <>
          {!scoped && <Empty />}
          {scoped && docs && <StatusLine progress={scoped} docs={docs} />}
          {docs && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {docs.steps.map(step => <StepRow key={step.key} step={step} />)}
            </div>
          )}
        </>
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

/**
 * The one-line headline: what's happening, or what happened.
 *
 * Stalled/failed/circuit-breaker read from the WHOLE run (`progress`) — those are legitimately
 * whole-cycle concerns (a stalled run needs "Resume" regardless of which stage it stalled in).
 * The ordinary running/finished framing reads from `docs` (Assets + Briefing only) instead — see
 * documentProgress's docstring for why: a founder's "documents" is 5-6 things, not 12, and
 * Actions already narrate themselves via ActionsPanel below.
 */
function StatusLine({ progress, docs }: { progress: RunProgress; docs: ReturnType<typeof documentProgress> }) {
  const { status, stalled, failureReason, done, total } = progress

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
  if (status === 'failed') {
    return (
      <Line color={red}>
        Stopped early — {done} of {total} finished. What did complete is saved; running again
        retries the rest.
      </Line>
    )
  }
  if (status === 'running' && !docs.finished) {
    return (
      <Line color={blue}>
        {docs.currentLabel ? `Working on ${docs.currentLabel}…` : 'Working…'} ({docs.done} of {docs.total})
      </Line>
    )
  }
  // Reads as "finished" the moment every document + the briefing are done — even if the run is
  // still `running` because Actions are still being decided behind the scenes (that's their own
  // story, told by ActionsPanel, not this line).
  return (
    <Line color={green}>
      Finished — {docs.done} of {docs.total} documents ready. Your briefing is below.
    </Line>
  )
}

// UX_SPEC §6: serif is for the executive's own voice, never chrome or data — this line is
// the team addressing the founder directly ("Working on X…", "Finished — your briefing is
// below"), so it qualifies. Priorities/metrics lists elsewhere stay as-is; those are facts.
function Line({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p style={{ color, fontFamily: FONT_SERIF, fontSize: 14, marginTop: 10, lineHeight: 1.6, maxWidth: 560 }}>
      {children}
    </p>
  )
}

function StepRow({ step }: { step: ProgressStep }) {
  const { icon, color, note } = stepLook(step.state)
  const KindIcon = kindIcon(step.kind)
  const isActive = step.state === 'active'
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14,
        // A little more present than a 15px spinner alone — this is the "your team is working
        // on this right now" row, deliberately still lighter than ActivationScreen's cards
        // (that's the first-time ceremony; this is the ambient, ongoing view).
        background: isActive ? alpha(blue, 0.05) : 'transparent',
        borderRadius: 8, padding: isActive ? '6px 8px' : 0, margin: isActive ? '-6px -8px' : 0,
      }}
    >
      <span style={{ display: 'flex', width: 16, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <KindIcon size={12} color={muted} style={{ flexShrink: 0 }} />
          <span style={{ color: step.state === 'pending' ? muted : ink, fontWeight: isActive ? 600 : 400, flex: 1 }}>{step.label}</span>
          {note && <span style={{ color, fontSize: 12, flexShrink: 0 }}>{note}</span>}
        </div>
        {step.preview && (
          // Fades in once, the moment this step's preview first appears (mount-only —
          // ActivationScreen owns the bigger, staggered first-cycle ceremony; recurring
          // cycles get this same content, presented calmer, so they don't read as dead
          // by comparison).
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            style={{
              color: muted, fontSize: 12, margin: '4px 0 0', lineHeight: 1.5,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}
          >
            {step.preview}
          </motion.p>
        )}
      </div>
    </div>
  )
}

/** PRD 2 Stage 2 Part A — the live-generation row. Same visual language as StepRow's 'active'
 *  tint (a calmer, ongoing look, not ActivationScreen's first-time ceremony) rather than a new
 *  loading pattern. */
function StreamingRow({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, marginTop: 14,
        background: alpha(blue, 0.05), borderRadius: 8, padding: '8px 10px',
      }}
    >
      <span style={{ display: 'flex', width: 16, marginTop: 2, flexShrink: 0 }}>
        <Loader2 size={15} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: ink, fontWeight: 600 }}>Writing…</span>
        <p
          style={{
            color: muted, fontSize: 12, margin: '4px 0 0', lineHeight: 1.5,
            whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto',
          }}
        >
          {text || 'Starting…'}
        </p>
      </div>
    </div>
  )
}

function kindIcon(kind: StepKind) {
  if (kind === 'briefing') return MessageSquare
  if (kind === 'action') return Send
  return FileText
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
