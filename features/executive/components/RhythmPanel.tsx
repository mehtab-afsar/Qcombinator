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
 * The poll/SSE/Realtime state itself is owned by `useRhythmProgress` (features/executive/hooks),
 * called ONCE by the parent page rather than here — AssetWorkspacePanel needs the same live run
 * data (to auto-open on, and show live text for, whichever document is currently generating),
 * and two independent Realtime subscriptions for the same run would be wasteful and could drift.
 * This component only renders it; see useRhythmProgress's own docstring for the fetch/subscribe
 * side.
 *
 * Client boundary: server-provided progress state only, never imports lib/registry|rhythm — the
 * server hands over already-named steps (CLAUDE.md §2, the frontend renders state).
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { bdr, muted, amber, red, alpha } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import type { RhythmProgressState } from '../hooks/useRhythmProgress'
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
  /** The Registry asset id this step produces — asset steps only, else null. The server
   *  (lib/rhythm/progress.ts) always sends this; this client type used to drop it, which is
   *  exactly the gap that made "watch a document write itself live" impossible to build. */
  assetId: string | null
  /** The Registry action id this step attempts — action steps only, else null. */
  actionId: string | null
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
 * @param progressState from `useRhythmProgress()`, called ONCE by the parent page — see that
 *   hook's own docstring for why this isn't fetched/subscribed here anymore.
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
  progressState, executiveId, programTemplateId,
}: { progressState: RhythmProgressState; executiveId?: string; programTemplateId?: string }) {
  const {
    progress, history, loaded, live, now, error, streaming,
    sseLiveText: liveText, realtimeText, startCycle,
  } = progressState
  const [historyOpen, setHistoryOpen] = useState(false)

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
  const elapsedMs = live && programScoped ? now - new Date(programScoped.startedAt).getTime() : undefined

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
          {programScoped && docs && <StatusLine progress={programScoped} docs={docs} elapsedMs={elapsedMs} />}
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

