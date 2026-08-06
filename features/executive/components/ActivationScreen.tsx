'use client'

/**
 * F09 Activation — "the missing moment" (PRD §4). The confirm click no longer drops the
 * founder into an empty room with a "Run now" button; the very first cycle is already running
 * by the time this mounts (app/api/contracts/route.ts's POST calls startCycleIfDue), and this
 * screen watches it happen.
 *
 * Polls the SAME /api/rhythm/run endpoint RhythmPanel already polls (just faster — 2s vs 5s,
 * since this is the one moment worth the extra chattiness) and reveals each artefact as its
 * step lands, one after another, real generated content — never token-by-token typing (that
 * would require forking judge.ts's generateAssetContent into a second, streaming generation
 * path, which is exactly the "second parallel way to do the same thing" CLAUDE.md exists to
 * prevent, for a cosmetic win). Each document appears whole, the moment it's actually done.
 *
 * Client boundary: same rule as RhythmPanel — fetches via /api/rhythm/run and /api/assets/:id,
 * never imports lib/registry|rhythm directly.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { bg, bdr, ink, muted, blue, green, surf } from '@/lib/constants/colors'
import { ease } from '@/features/shared/tokens'

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'skipped'

interface ProgressStep {
  key: string
  label: string
  state: StepState
  kind: 'asset' | 'briefing' | 'action'
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

interface RevealedAsset {
  assetId: string
  name: string
  preview: string
}

/** Faster than RhythmPanel's 5s — this is the one screen where the extra chattiness earns its keep. */
const POLL_MS = 2_000

/** markdown is already text; json is pretty-printed and clipped — this is a glimpse, not the editor. */
function preview(content: unknown, outputSchema: 'markdown' | 'json'): string {
  const text = outputSchema === 'markdown'
    ? (typeof content === 'string' ? content : '')
    : (() => { try { return JSON.stringify(content ?? {}, null, 2) } catch { return '' } })()
  return text.length > 280 ? `${text.slice(0, 280)}…` : text
}

export function ActivationScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState<RunProgress | null>(null)
  const [revealed, setRevealed] = useState<RevealedAsset[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedAssetIds = useRef(new Set<string>())
  const completedRef = useRef(false)

  const revealAsset = useCallback(async (assetId: string) => {
    if (fetchedAssetIds.current.has(assetId)) return
    fetchedAssetIds.current.add(assetId)
    try {
      const res = await fetch(`/api/assets/${assetId}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.asset) return
      setRevealed(prev => [
        ...prev,
        { assetId, name: data.definition?.name ?? assetId, preview: preview(data.asset.content, data.definition?.outputSchema ?? 'markdown') },
      ])
    } catch {
      /* a missed reveal isn't fatal — the artefact is still reachable from the Assets home */
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rhythm/run')
      if (!res.ok) return
      const data = await res.json()
      const p: RunProgress | null = data.progress ?? null
      setProgress(p)
      if (!p) return

      for (const step of p.steps) {
        if (step.kind === 'asset' && step.assetId && (step.state === 'done' || step.state === 'skipped')) {
          void revealAsset(step.assetId)
        }
      }

      if (p.status !== 'running' && !completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    } catch {
      /* transient — the next poll retries */
    }
  }, [revealAsset, onComplete])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (completedRef.current) return
    timer.current = setInterval(() => { void load() }, POLL_MS)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [load, progress?.status])

  const done = progress?.done ?? 0
  const total = progress?.total ?? 0

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
          {revealed.map(asset => (
            <motion.div
              key={asset.assetId}
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
                <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{asset.name}</span>
              </div>
              {asset.preview && (
                <p style={{
                  color: muted, fontSize: 13, marginTop: 8, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', maxHeight: 90, overflow: 'hidden',
                }}>
                  {asset.preview}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {progress?.status === 'running' && (
          <div style={{
            background: surf, border: `1px dashed ${bdr}`, borderRadius: 12,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Loader2 size={15} color={blue} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: muted, fontSize: 13 }}>
              {progress.currentLabel ?? 'Working…'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
