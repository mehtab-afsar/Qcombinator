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
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Loader2, Circle, AlertCircle, Minus, FileText, MessageSquare, Send, ExternalLink } from 'lucide-react'
import { bg, bdr, ink, muted, blue, green, red, surf } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { scopeStepsToExecutive, documentProgress } from '../lib/scope-progress'
import type { Rect } from '../lib/panel-origin'
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
  /** Null for briefing/action steps — only asset steps have a real document behind them to
   *  open. Lets a finished document in the step list link straight to /founder/assets/[id]
   *  instead of making a founder wait for the WHOLE cycle before reading anything. */
  assetId: string | null
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
 *  keep up. Rendered as markdown (same ReactMarkdown/remarkGfm treatment as
 *  AssetWorkspaceBody.tsx's own Read view) rather than raw text — without this, a document
 *  streaming in showed literal "# ICP Profiles" / "**Company:**" the whole time it was being
 *  written. react-markdown tolerates a not-yet-closed heading/bold mid-stream; it just renders
 *  what's parseable so far, same as any incremental markdown renderer. Its own component so the
 *  scroll ref is stable across re-renders. */
function LiveTextBox({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <div
      ref={ref}
      style={{
        color: ink, fontFamily: FONT_SERIF, fontSize: 13, marginTop: 6, lineHeight: 1.6,
        maxHeight: 420, overflowY: 'auto', paddingRight: 4,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
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
 *  being written on the right. Compact by design; full content lives in the reading pane.
 *
 *  A finished document (done OR skipped — ADR-028's "no change needed" still has a real, existing
 *  asset behind it) opens straight away — a founder shouldn't have to wait for the whole cycle
 *  (documents + briefing + actions) before reading the FIRST thing that's actually ready.
 *
 *  @param onOpenAsset when supplied (the per-executive cockpit, which already owns
 *    AssetWorkspacePanel — CANVAS_SPEC §5, "preserve the sense of place"), a finished document
 *    opens IN PLACE, the same panel/expand every other document card in this app already uses —
 *    not a new tab, which was the wrong call on the first pass of this feature. Omitted only on
 *    the CEO hub tab, which has no such panel wired up yet; that path still falls back to a
 *    plain new-tab link rather than not being viewable at all. */
function StepList({
  steps, onOpenAsset,
}: {
  steps: ProgressStep[]
  onOpenAsset?: (assetId: string, originRect: Rect) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {steps.map(step => {
        const { icon, note } = stepLook(step.state)
        const KindIcon = kindIcon(step.kind)
        const isActive = step.state === 'active'
        const viewable = (step.state === 'done' || step.state === 'skipped') && step.assetId

        const rowStyle: React.CSSProperties = {
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 8px',
          borderRadius: 6, background: isActive ? surf : 'transparent',
        }
        const rowContent = (
          <>
            <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
            <KindIcon size={11} color={muted} style={{ flexShrink: 0 }} />
            <span style={{
              color: step.state === 'pending' ? muted : ink, fontWeight: isActive ? 600 : 400,
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'left',
            }}>
              {step.label}
            </span>
            {viewable
              ? <ExternalLink size={11} color={muted} style={{ flexShrink: 0 }} />
              : note && <span style={{ color: muted, fontSize: 11, flexShrink: 0 }}>{note}</span>}
          </>
        )

        if (!viewable) return <div key={step.key} style={rowStyle}>{rowContent}</div>

        if (onOpenAsset) {
          return (
            <button
              key={step.key}
              onClick={e => onOpenAsset(step.assetId!, e.currentTarget.getBoundingClientRect())}
              style={{ ...rowStyle, width: '100%', border: 'none', background: rowStyle.background, cursor: 'pointer', font: 'inherit' }}
            >
              {rowContent}
            </button>
          )
        }

        return (
          <Link key={step.key} href={`/founder/assets/${step.assetId}`} target="_blank" style={{ textDecoration: 'none' }}>
            <div style={rowStyle}>{rowContent}</div>
          </Link>
        )
      })}
    </div>
  )
}

export function ActivationScreen({
  executiveId, onComplete, onOpenAsset,
}: {
  /** Scopes the reveal to one executive's steps — the per-executive cockpit page's usage.
   *  Omitted on the CEO tab, where watching the WHOLE team assemble is the correct picture. */
  executiveId?: string
  onComplete: () => void
  /** Passed straight through to StepList — see its own docstring for why this is optional. */
  onOpenAsset?: (assetId: string, originRect: Rect) => void
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

      // stalled: the run is still 'running' but its chain has gone quiet — it will never reach
      // 'completed' on its own, so watching it poll forever would trap the founder here. Settle
      // out the same as a real completion; the rest of the app (RhythmPanel etc.) already knows
      // how to show a stuck/failed cycle.
      if ((p.status !== 'running' || p.stalled) && !completedRef.current) {
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
          <StepList steps={allSteps} onOpenAsset={onOpenAsset} />
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
        <div style={{
          color: ink, fontSize: isBriefing ? 14 : 13, marginTop: 10, lineHeight: 1.7,
          maxHeight: 420, overflowY: 'auto',
          fontFamily: isBriefing ? FONT_SERIF : 'inherit',
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
