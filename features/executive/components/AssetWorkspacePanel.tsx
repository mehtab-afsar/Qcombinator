'use client'

/**
 * CANVAS_SPEC §5 — the node workspace, opened from a Documents card inside the cockpit: "a
 * panel/expand, not a jump to an unrelated page — preserve the sense of place." Same slide-over
 * mechanic as NotificationPanel.tsx (position: fixed, AnimatePresence, backdrop, Escape to
 * close) — reused, not reinvented. The actual content is AssetWorkspaceBody, shared with the
 * full-page /founder/assets/[id] route so both surfaces stay identical.
 *
 * PRD 2 Stage 3 — when the click that opened this panel is known (`originRect`), the panel
 * visually grows out of the clicked card (features/executive/lib/panel-origin.ts) instead of
 * always sliding in from the screen edge. Falls back to the original plain slide when there's no
 * origin (a direct/deep-linked `?asset=` load) or the founder prefers reduced motion. The EXIT
 * animation is the same `x: '100%'` slide-off either way — a transform layered on top of
 * wherever the box ends up docked, so it doesn't need to know which entrance path was taken.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { bg, bdr, ink, muted, white } from '@/lib/constants/colors'
import { useAssetWorkspace } from '../hooks/useAssetWorkspace'
import { useMotionPrefs } from '@/features/shared/hooks/useMotionPrefs'
import { panelOriginAnimation, type Rect } from '../lib/panel-origin'
import { AssetWorkspaceBody } from './AssetWorkspaceBody'
import { isLiveStream, type LiveStream } from '../hooks/live-stream'

export function AssetWorkspacePanel({
  assetId, originRect, onClose, liveStream,
}: {
  assetId: string | null
  originRect: Rect | null
  onClose: () => void
  /** Set only while THIS asset is actively generating — see useRhythmProgress's own docstring.
   *  Undefined for a normal open; the panel just shows the last saved version as always. */
  liveStream?: LiveStream | null
}) {
  const reducedMotion = useMotionPrefs()
  // Measured once per open, not on every resize — the panel's entrance only needs a value at the
  // moment it appears, never mid-animation.
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (assetId) setViewport({ width: window.innerWidth, height: window.innerHeight })
  }, [assetId])

  useEffect(() => {
    if (!assetId) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [assetId, onClose])

  // Widened from 640 — a document reading pane this narrow read as "an expanding card," not
  // somewhere you'd actually settle in to read (CEO_UX follow-up, "make it a bit broader").
  const panelWidth = viewport ? Math.min(880, viewport.width * 0.92) : 880
  const origin = !reducedMotion && viewport
    ? panelOriginAnimation(originRect, panelWidth, viewport.width, viewport.height)
    : null

  return (
    <AnimatePresence>
      {assetId && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
          />
          {origin ? (
            <motion.div
              key="panel"
              // Spread into fresh object literals, not passed as the named BoxGeometry value
              // directly — framer-motion's Target type wants an inline literal here (it accepts
              // one via TS's more lenient fresh-object-literal check), not a pre-typed variable.
              initial={{ ...origin.initial }}
              animate={{ ...origin.animate }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', zIndex: 201, background: white,
                borderLeft: `1px solid ${bdr}`, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <PanelHeader assetId={assetId} onClose={onClose} />
              {/* A short delayed fade for the content — expanding the box straight from a
                  card-sized rect would otherwise show squeezed document text mid-transition. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.16 }}
                style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px', background: bg }}
              >
                <PanelBody assetId={assetId} liveStream={liveStream} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
                width: 'min(880px, 92vw)', background: white,
                borderLeft: `1px solid ${bdr}`, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <PanelHeader assetId={assetId} onClose={onClose} />
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px', background: bg }}>
                <PanelBody assetId={assetId} liveStream={liveStream} />
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

function PanelHeader({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px', borderBottom: `1px solid ${bdr}`,
    }}>
      <span style={{ color: muted, fontSize: 13 }}>{assetId}</span>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted,
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

/** Its own component so useAssetWorkspace only mounts (and fetches) once assetId is real —
 *  AnimatePresence keeps the outer panel briefly mounted during exit, but there's nothing left
 *  to load by then. */
function PanelBody({ assetId, liveStream }: { assetId: string; liveStream?: LiveStream | null }) {
  const workspace = useAssetWorkspace(assetId)

  // The moment generation settles (the stream goes from live to not), pull the real saved
  // version — every other path into a fresh version already calls `reload` internally; this is
  // the one external trigger for it. Skipped on first mount (the stream starts wherever it starts;
  // the initial `load()` inside the hook already covers that case).
  const wasLive = useRef(isLiveStream(liveStream))
  useEffect(() => {
    if (wasLive.current && !isLiveStream(liveStream)) void workspace.reload()
    wasLive.current = isLiveStream(liveStream)
  }, [liveStream, workspace])

  if (workspace.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Loader2 size={20} color={muted} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: ink, fontSize: 20, fontWeight: 600, margin: 0 }}>
        {workspace.def?.name ?? 'Asset'}
      </h2>
      <div style={{ marginTop: 12 }}>
        <AssetWorkspaceBody workspace={workspace} liveStream={liveStream} />
      </div>
    </div>
  )
}
