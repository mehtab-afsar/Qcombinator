'use client'

/**
 * F09 Activation — "the missing moment" (PRD §4). The confirm click no longer drops the
 * founder into an empty room with a "Run now" button; the very first cycle is already running
 * by the time this mounts (app/api/contracts/route.ts's POST calls startCycleIfDue), and this
 * screen watches it happen.
 *
 * Two-pane layout (PRD 2 Stage 3 follow-up, after the single-column version read as "just a
 * list"): a left rail with the complete step list (Assets, Briefing, Actions — StepList, below)
 * so a founder always sees the whole cycle's shape, and a right reading pane (ReadingPane) that
 * shows exactly one document at a time — live while it's being written, then its settled preview
 * once done, replaced by the next one as the cycle progresses. Actions never populate the reading
 * pane (nothing streams for them — see the Part B note below); their progress shows in the left
 * rail only.
 *
 * Polls the SAME /api/rhythm/run endpoint RhythmPanel already polls (just faster — 2s vs 5s,
 * since this is the one moment worth the extra chattiness). The settled preview text is
 * server-computed (lib/rhythm/preview.ts, attached to each step by GET /api/rhythm/run) — the
 * same step.preview field RhythmPanel reads, so both surfaces are one source of truth, two
 * presentations (CLAUDE.md "one of each").
 *
 * PRD 2 Stage 2 Part B — the reading pane shows REAL live text, token by token, while a document
 * is actively being written: the currently-generating step runs entirely server-to-server (this
 * screen's own browser was never connected to it — see lib/rhythm/trigger.ts), so a Supabase
 * Realtime subscription on this run's own row is what carries lib/rhythm/streaming.ts's batched
 * writes here, the same postgres_changes pattern already used by useMessageThread.ts/
 * useQScore.tsx, reused for UPDATE instead of INSERT. Degrades gracefully to "Starting…" (no
 * live text, same as before Part B) if Realtime is unavailable — this was always cosmetic, never
 * load-bearing: the settled reveal still lands from the ordinary poll either way.
 *
 * Client boundary: same rule as RhythmPanel — fetches via /api/rhythm/run, never imports
 * lib/registry|rhythm directly.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Circle, AlertCircle, Minus, FileText, MessageSquare, Send } from 'lucide-react'
import { bg, bdr, ink, muted, blue, green, red, surf } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import { createClient } from '@/lib/supabase/client'

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'
type StepKind = 'asset' | 'briefing' | 'action'

interface ProgressStep {
  key: string
  label: string
  state: StepState
  kind: StepKind
  preview: string | null
  // Already on the wire (lib/rhythm/progress.ts) — RhythmPanel's identical-shaped type has
  // always carried it. Added here so this screen can be scoped to one executive (below); its
  // absence before now was an oversight, not a design choice.
  executiveId: string | null
}

interface RunProgress {
  runId: string
  status: 'running' | 'completed' | 'failed'
  stalled: boolean
  done: number
  total: number
  currentLabel: string | null
  steps: ProgressStep[]
}

/** Faster than RhythmPanel's 5s — this is the one screen where the extra chattiness earns its keep. */
const POLL_MS = 2_000

const SETTLED: ReadonlySet<StepState> = new Set(['done', 'skipped'])

/** A real reading pane for the live-streamed document, not a 90px peephole — auto-scrolls to
 *  the bottom as text arrives, so watching it get written doesn't require manually scrolling to
 *  keep up. Its own component so the scroll ref is stable across re-renders. */
function LiveTextBox({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <p
      ref={ref}
      style={{
        color: ink, fontSize: 13, marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap',
        maxHeight: 420, overflowY: 'auto', paddingRight: 4,
      }}
    >
      {text}
    </p>
  )
}

function kindIcon(kind: StepKind) {
  if (kind === 'briefing') return MessageSquare
  if (kind === 'action') return Send
  return FileText
}

/** Same visual language as RhythmPanel's own stepLook — icon + color per state, kept local
 *  rather than imported since RhythmPanel's is a private, unexported helper. */
function stepLook(state: StepState): { icon: React.ReactNode; note: string | null } {
  switch (state) {
    case 'done': return { icon: <Check size={14} color={green} />, note: null }
    case 'active': return { icon: <Loader2 size={14} color={blue} style={{ animation: 'spin 1s linear infinite' }} />, note: 'working' }
    case 'failed': return { icon: <AlertCircle size={14} color={red} />, note: 'failed' }
    case 'skipped': return { icon: <Minus size={14} color={muted} />, note: 'no change' }
    default: return { icon: <Circle size={8} color={bdr} />, note: null }
  }
}

/** The left rail — the complete step list (Assets, Briefing, Actions, in server order), always
 *  visible so a founder can see the whole cycle's shape while reading the one document actively
 *  being written on the right. Compact by design; full content lives in the reading pane. */
function StepList({ steps }: { steps: ProgressStep[] }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {steps.map(step => {
        const { icon, note } = stepLook(step.state)
        const KindIcon = kindIcon(step.kind)
        const isActive = step.state === 'active'
        return (
          <div
            key={step.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 8px',
              borderRadius: 6, background: isActive ? surf : 'transparent',
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
            <KindIcon size={11} color={muted} style={{ flexShrink: 0 }} />
            <span style={{
              color: step.state === 'pending' ? muted : ink, fontWeight: isActive ? 600 : 400,
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {step.label}
            </span>
            {note && <span style={{ color: muted, fontSize: 11, flexShrink: 0 }}>{note}</span>}
          </div>
        )
      })}
    </div>
  )
}

export function ActivationScreen({
  executiveId, onComplete,
}: {
  /** Scopes the reveal to one executive's steps — the per-executive cockpit page's usage.
   *  Omitted on the CEO tab, where watching the WHOLE team assemble is the correct picture. */
  executiveId?: string
  onComplete: () => void
}) {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<string[]>([])
  const [liveText, setLiveText] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rhythm/run')
      if (!res.ok) return
      const data = await res.json()
      const fetched: RunProgress | null = data.progress ?? null
      const p: RunProgress | null = fetched && executiveId
        ? { ...fetched, ...scopeStepsToExecutive(fetched.steps, executiveId) }
        : fetched
      setProgress(p)
      if (!p) return

      setRevealedKeys(prev => {
        const settledKeys = p.steps.filter(s => SETTLED.has(s.state)).map(s => s.key)
        const next = settledKeys.filter(k => !prev.includes(k))
        return next.length > 0 ? [...prev, ...next] : prev
      })

      if (p.status !== 'running' && !completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    } catch {
      /* transient — the next poll retries */
    }
  }, [onComplete, executiveId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (completedRef.current) return
    timer.current = setInterval(() => { void load() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [load, progress?.status])

  // PRD 2 Stage 2 Part B — subscribe to THIS run's own row for live text while it's actively
  // generating. Re-subscribes if the run id ever changes (it won't mid-activation, but this
  // keys correctly regardless); cleans up on unmount same as useMessageThread.ts.
  const runId = progress?.runId ?? null
  useEffect(() => {
    setLiveText('')
    if (!runId) return
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
            setLiveText(text ?? '')
          },
        )
        .subscribe()
    } catch {
      /* Realtime unavailable — the settled reveal above still lands from the ordinary poll */
    }
    return () => {
      try { if (channel) supabase.removeChannel(channel) } catch { /* ignore */ }
    }
  }, [runId])

  // Documents (Assets + the Briefing), not the whole run's 12-step count — the headline
  // number/label shouldn't read as "12 documents" any more than RhythmPanel's did.
  const docs = documentProgress(progress?.steps ?? [])
  const { done, total, currentLabel } = docs
  const allSteps = progress?.steps ?? []
  const revealed = allSteps.filter(s => revealedKeys.includes(s.key))

  // The reading pane's content, in priority order: the document actively streaming right now →
  // the most recently finished one → a calm placeholder before anything has landed. Actions
  // never populate this (lib/rhythm/run.ts only streams Assets/Briefing) — the left rail is
  // where their progress shows instead.
  const activeDocStep = docs.steps.find(s => s.state === 'active') ?? null
  const lastDocStep = [...revealed].reverse().find(s => s.kind !== 'action' && s.preview) ?? null

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <p style={{ color: muted, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', margin: 0 }}>
        Activation
      </p>
      <h1 style={{ color: ink, fontSize: 26, fontWeight: 600, margin: '6px 0 0' }}>
        Your team is starting on your mandate
      </h1>
      <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
        {currentLabel
          ? `Working on ${currentLabel}… (${done} of ${total})`
          : `Getting started… (${done} of ${total})`}
        {' '}Each document appears here as it&rsquo;s finished — stay on this page, or come back later.
      </p>

      <div style={{ marginTop: 28, display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ width: 260, flexShrink: 0 }}>
          <StepList steps={allSteps} />
        </div>

        <div style={{
          flex: 1, minWidth: 0, background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
          padding: '20px 24px', minHeight: 320,
        }}>
          {activeDocStep ? (
            <ReadingPane
              label={activeDocStep.label}
              text={liveText}
              isBriefing={activeDocStep.kind === 'briefing'}
              live
            />
          ) : lastDocStep ? (
            <ReadingPane
              label={lastDocStep.label}
              text={lastDocStep.preview ?? ''}
              isBriefing={lastDocStep.kind === 'briefing'}
              live={false}
            />
          ) : (
            <p style={{ color: muted, fontSize: 14 }}>Getting started…</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadingPane({
  label, text, isBriefing, live,
}: {
  label: string
  text: string
  isBriefing: boolean
  /** True while this is the currently-streaming document — shows a spinner and auto-scrolls;
   *  false for a settled step's preview, which is a normal static read. */
  live: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {live
          ? <Loader2 size={15} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
          : <Check size={15} color={green} />}
        <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{label}</span>
      </div>
      {live ? (
        text
          ? <LiveTextBox text={text} />
          : <p style={{ color: muted, fontSize: 13, marginTop: 10 }}>Starting…</p>
      ) : (
        <p style={{
          color: ink, fontSize: isBriefing ? 14 : 13, marginTop: 10, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', maxHeight: 420, overflowY: 'auto',
          fontFamily: isBriefing ? FONT_SERIF : 'inherit',
        }}>
          {text}
        </p>
      )}
    </div>
  )
}
