'use client'

/**
 * F09 Activation — "the missing moment" (PRD §4). The confirm click no longer drops the
 * founder into an empty room with a "Run now" button; the very first cycle is already running
 * by the time this mounts (app/api/contracts/route.ts's POST calls startCycleIfDue), and this
 * screen watches it happen.
 *
 * Polls the SAME /api/rhythm/run endpoint RhythmPanel already polls (just faster — 2s vs 5s,
 * since this is the one moment worth the extra chattiness) and reveals each artefact as its
 * step lands, one after another — real content, never token-by-token typing (that would
 * require forking judge.ts's generation into a second, streaming path, which is exactly the
 * "second parallel way to do the same thing" CLAUDE.md exists to prevent, for a cosmetic win).
 *
 * The preview text itself is server-computed (lib/rhythm/preview.ts, attached to each step by
 * GET /api/rhythm/run) — this used to fetch each asset's content itself, one request per
 * asset; now it just reads step.preview, the same field RhythmPanel reads, so both surfaces
 * are one source of truth, two presentations (CLAUDE.md "one of each").
 *
 * PRD 2 Stage 2 Part B — the "Working on X…" line below now shows real live text, not just a
 * spinner: the currently-generating step runs entirely server-to-server (this screen's own
 * browser was never connected to it — see lib/rhythm/trigger.ts), so a Supabase Realtime
 * subscription on this run's own row is what carries lib/rhythm/streaming.ts's batched writes
 * here, the same postgres_changes pattern already used by useMessageThread.ts/useQScore.tsx,
 * reused for UPDATE instead of INSERT. Degrades gracefully to the plain "Working…" line (as
 * before) if Realtime is unavailable — this was always cosmetic, never load-bearing: the
 * settled reveal above still lands from the ordinary poll either way.
 *
 * Client boundary: same rule as RhythmPanel — fetches via /api/rhythm/run, never imports
 * lib/registry|rhythm directly.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, FileText, MessageSquare, Send } from 'lucide-react'
import { bg, bdr, ink, muted, blue, green, surf } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { ease } from '@/features/shared/tokens'
import { scopeStepsToExecutive } from '../lib/scope-progress'
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

function kindIcon(kind: StepKind) {
  if (kind === 'briefing') return MessageSquare
  if (kind === 'action') return Send
  return FileText
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

  const done = progress?.done ?? 0
  const total = progress?.total ?? 0
  const revealed = (progress?.steps ?? []).filter(s => revealedKeys.includes(s.key))

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <p style={{ color: muted, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', margin: 0 }}>
        Activation
      </p>
      <h1 style={{ color: ink, fontSize: 26, fontWeight: 600, margin: '6px 0 0' }}>
        Your team is starting on your mandate
      </h1>
      <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
        {progress?.currentLabel
          ? `Working on ${progress.currentLabel}… (${done} of ${total})`
          : `Getting started… (${done} of ${total})`}
        {' '}Each document appears here as it&rsquo;s finished — stay on this page, or come back later.
      </p>

      <div style={{ marginTop: 28, display: 'grid', gap: 14 }}>
        <AnimatePresence initial={false}>
          {revealed.map(step => {
            const KindIcon = kindIcon(step.kind)
            const isBriefing = step.kind === 'briefing'
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease }}
                style={{
                  background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
                  padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color={green} />
                  <KindIcon size={13} color={muted} />
                  <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{step.label}</span>
                </div>
                {step.preview && (
                  <p style={{
                    color: ink, fontSize: isBriefing ? 14 : 13, marginTop: 8, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', maxHeight: 90, overflow: 'hidden',
                    fontFamily: isBriefing ? FONT_SERIF : 'inherit',
                  }}>
                    {step.preview}
                  </p>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {progress?.status === 'running' && (
          <div style={{
            background: surf, border: `1px dashed ${bdr}`, borderRadius: 12,
            padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Loader2 size={15} color={blue} style={{ marginTop: 2, flexShrink: 0, animation: 'spin 1s linear infinite' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: muted, fontSize: 13 }}>
                {progress.currentLabel ?? 'Working…'}
              </span>
              {liveText && (
                // Real live text (PRD 2 Stage 2 Part B) — not the settled preview above, which
                // only appears once a step lands; this is the same document, mid-generation.
                <p style={{
                  color: ink, fontSize: 13, marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  maxHeight: 90, overflow: 'hidden',
                }}>
                  {liveText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
