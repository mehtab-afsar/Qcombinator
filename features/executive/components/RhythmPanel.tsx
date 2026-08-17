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
 * PRD 2 — the ONE place a founder watches a cycle happen, regardless of how it started (their
 * own "Run now" click, the automatic first cycle right after confirming a mandate, or the
 * weekly cron). A separate full-screen "Activation" takeover used to own the first-cycle case
 * specifically; retired in favor of always showing this normal view (CANVAS_SPEC D1, "one
 * interface... never two UIs" — direct founder feedback that a takeover fought this rule). Two
 * streaming sources, composed: `useStreamedRhythmStep`'s own SSE (Part A, below) gives instant
 * feedback for the exact moment of a manual click, covering only step 1 of that one request; a
 * Supabase Realtime subscription on this run's `streaming_text` (Part B, moved here from the
 * now-deleted ActivationScreen.tsx) covers everything else — steps 2+ of that same click, and
 * any cycle this browser didn't itself trigger. Degrades gracefully to the ordinary poll if
 * Realtime is unavailable — always cosmetic, never load-bearing.
 *
 * Client boundary: fetches via /api/rhythm/run and never imports lib/registry|rhythm — the
 * server hands over already-named steps (CLAUDE.md §2, the frontend renders state).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { bdr, muted, amber, red, alpha } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import { useStreamedRhythmStep } from '../hooks/useStreamedRhythmStep'
import { POLL_MS, isCycleLive } from '../lib/useCycleLive'
import { createClient } from '@/lib/supabase/client'
import { Empty, StatusLine, StepRow, StreamingRow, HistoryRow } from './RhythmStepList'

export type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'
export type StepKind = 'asset' | 'briefing' | 'action'

export interface ProgressStep {
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

export interface RunProgress {
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
export interface RunSummary {
  id: string
  cycleKey: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  done: number
  total: number
}

/** Same recompute scopeStepsToExecutive does (steps filtered, done/total/currentLabel derived
 *  from the filtered set), for a second dimension (Program instead of Executive) — not folded
 *  into that shared helper since only this panel currently needs to narrow by both. */
function narrowToProgram<T extends { steps: ProgressStep[] }>(
  scoped: T,
  programTemplateId: string,
): T {
  const steps = scoped.steps.filter(s => s.templateId === programTemplateId)
  return {
    ...scoped,
    steps,
    done: steps.filter(s => s.state === 'done' || s.state === 'skipped').length,
    total: steps.length,
    currentLabel: steps.find(s => s.state === 'active')?.label ?? null,
  }
}

/**
 * @param executiveId scope the step list (and its done/total counts) to one executive's steps —
 *   the detail page. "Run now" still starts the WHOLE weekly cycle regardless (there is no way to
 *   run one Program in isolation — CLAUDE.md §1: no runsWhen/event-skipping in v1); only the
 *   display narrows, not the actual trigger.
 * @param programTemplateId narrow further to one Program (e.g. 'P001') on a multi-Program
 *   executive's page. Additive — omitted means "every Program this executive owns," the same
 *   behavior this panel always had. ProgressStep.templateId already carries this, so no new data
 *   is needed, only a filter.
 */
export function RhythmPanel({
  executiveId, programTemplateId,
}: { executiveId?: string; programTemplateId?: string } = {}) {
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

  // PRD 2 Stage 2 Part B, moved here from the deleted ActivationScreen.tsx — live text for
  // whatever's actively generating, regardless of who/what triggered this run. Same
  // postgres_changes pattern already used by useMessageThread.ts/useQScore.tsx, reused for
  // UPDATE instead of INSERT. Independent of useStreamedRhythmStep's own SSE (Part A) — that
  // only covers the exact moment of a founder's own click; this covers everything else,
  // including steps 2+ of that same click once the click's own SSE call has returned.
  const runId = progress?.runId ?? null
  const [realtimeText, setRealtimeText] = useState('')
  useEffect(() => {
    setRealtimeText('')
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
            const text = (payload.new as { streaming_text: string | null }).streaming_text
            setRealtimeText(text ?? '')
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

  // Narrow further to one Program on a multi-Program executive's page. A local second pass
  // rather than generalizing scopeStepsToExecutive's predicate — that helper is shared with
  // BirdsEyeStats and only this panel currently needs to narrow by two dimensions.
  const programScoped = scoped && programTemplateId
    ? narrowToProgram(scoped, programTemplateId)
    : scoped

  // Documents (Assets + the Briefing), separate from Actions — Actions already have their own
  // surface below (ActionsPanel). Without this, "This week's cycle" reads as "12 documents" when
  // it's really 5 documents, 1 briefing, and 6 actions — see documentProgress's own docstring.
  const docs = programScoped ? documentProgress(programScoped.steps) : null

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
          {!programScoped && <Empty />}
          {programScoped && docs && <StatusLine progress={programScoped} docs={docs} />}
          {docs && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {docs.steps.map(step => (
                <StepRow
                  key={step.key}
                  step={step}
                  liveText={step.state === 'active' ? realtimeText : undefined}
                />
              ))}
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

