'use client'

/**
 * The presentational half of RhythmPanel — the step list, its status line, the streaming row,
 * and past-cycle history rows. Split out because RhythmPanel.tsx was over CLAUDE.md's ~300-line
 * ceiling; every export here is already pure/presentational with no hooks and no closure over
 * RhythmPanel's own state (its two live data sources — the SSE hook and the Supabase Realtime
 * subscription — both stay in RhythmPanel.tsx, untouched), so this is a plain extraction, not a
 * redesign.
 */

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isLiveStream, type LiveStream } from '../hooks/live-stream'
import { Check, Loader2, AlertCircle, Minus, Circle, FileText, MessageSquare, Send } from 'lucide-react'
import { ink, muted, blue, green, amber, red, bdr, alpha } from '@/lib/constants/colors'
import { ease } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { formatElapsed } from '../lib/format-elapsed'
import type { StepState, StepKind, ProgressStep, RunProgress, RunSummary } from './RhythmPanel'

/** Matches STEP_LIMIT_EXCEEDED in lib/rhythm/limits.ts — the circuit breaker's reason code. */
const STEP_LIMIT_EXCEEDED = 'step_limit_exceeded'

type DocsProgress = { steps: ProgressStep[]; done: number; total: number; currentLabel: string | null; finished: boolean }

export function Empty() {
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
export function StatusLine({
  progress, docs, elapsedMs,
}: { progress: RunProgress; docs: DocsProgress; elapsedMs?: number }) {
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
  // A step can fail while OTHER steps/programs in the same cycle keep going — the run stays
  // `status: 'running'` until everything finishes, so without this check the line below would
  // just say "Working…" forever and never mention it. That step won't retry itself (run.ts marks
  // it 'failed' permanently for this run); it becomes retryable once the whole cycle concludes
  // and the "Run now" button reappears (RhythmPanel.tsx) — say so, don't leave it unexplained.
  const failedStep = docs.steps.find(s => s.state === 'failed')
  if (status === 'running' && failedStep) {
    return (
      <Line color={amber}>
        {failedStep.label} hit a snag — the rest of this cycle keeps going. It&rsquo;ll be ready
        to retry once this cycle finishes.
      </Line>
    )
  }
  if (status === 'running' && !docs.finished) {
    return (
      <Line color={blue}>
        {docs.currentLabel ? `Working on ${docs.currentLabel}…` : 'Working…'} ({docs.done} of {docs.total})
        {elapsedMs != null && ` · running for ${formatElapsed(elapsedMs)}`}
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

/** @param liveStream Realtime-sourced text for this exact step, only ever passed for the
 *   currently-active one (see RhythmPanel's Part B subscription) — rendered as markdown (raw
 *   `#`/`**` otherwise show through mid-stream) in the same slot `step.preview` occupies once
 *   settled. `step.preview` itself is already server-stripped to plain text by
 *   lib/rhythm/preview.ts, so it stays a plain paragraph, unchanged. */
export function StepRow({ step, liveStream }: { step: ProgressStep; liveStream?: LiveStream | null }) {
  const { icon, color, note } = stepLook(step.state)
  const KindIcon = kindIcon(step.kind)
  const isActive = step.state === 'active'
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14,
        // A little more present than a 15px spinner alone — this is the "your team is working
        // on this right now" row, the one place a founder watches a cycle happen (no separate
        // first-cycle ceremony screen anymore).
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
        {isLiveStream(liveStream) ? (
          <div style={{
            color: muted, fontSize: 12, margin: '4px 0 0', lineHeight: 1.5,
            maxHeight: 90, overflowY: 'auto',
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{liveStream!.text}</ReactMarkdown>
          </div>
        ) : step.preview && (
          // Fades in once, the moment this step's preview first appears.
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
export function StreamingRow({ text }: { text: string }) {
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

export function HistoryRow({ run }: { run: RunSummary }) {
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
