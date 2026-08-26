'use client'

/**
 * Watch a document write itself, live — the reading panel opens on its own the moment an Asset
 * step for THIS executive goes active, and shows the settled version once it's done. Only ever
 * opens into an empty state (never interrupts a founder already reading something else on
 * purpose), and never re-opens something they've just closed for this same generating step.
 *
 * Split out of app/founder/executive/[executiveId]/page.tsx (which was pushing past CLAUDE.md's
 * ~300-line ceiling) — this is genuinely one cohesive piece of behavior, not an arbitrary split.
 */

import { useEffect, useRef } from 'react'
import { scopeStepsToExecutive } from '../lib/scope-progress'
import { streamOwnedBy, type LiveStream } from './live-stream'
import type { RhythmProgressState } from './useRhythmProgress'
import type { ProgressStep } from '../components/RhythmPanel'

/**
 * Pure — the one piece of this file worth unit-testing directly without a hook-rendering
 * library (this codebase has none; see rhythm-action-chaining.test.ts's convention of testing
 * derivation logic directly rather than through a rendered component/hook). Which asset, if
 * any, is actively generating for this executive right now.
 */
export function activeAssetIdFor(steps: readonly ProgressStep[], executiveId: string): string | null {
  return scopeStepsToExecutive(steps, executiveId)
    .steps.find((s): s is ProgressStep & { assetId: string } => s.state === 'active' && s.kind === 'asset' && s.assetId != null)
    ?.assetId ?? null
}

/**
 * May the panel open itself right now? Pure, so the close-and-reopen behaviour a founder
 * actually experiences is pinned by tests rather than living only inside an effect.
 *
 * Auto-opening is a convenience and must never override intent: it yields to a founder already
 * reading something, and it never reopens the document they just closed. Reopening BY HAND is a
 * different path entirely (the page's own openAsset → the ?asset= URL) and nothing here gates
 * it — which is what makes "close it and open it again whenever I want" true.
 */
export function shouldAutoOpen(
  activeAssetId: string | null,
  openAssetId: string | null,
  dismissedId: string | null,
): boolean {
  if (!activeAssetId) return false // nothing is generating
  if (openAssetId) return false // they're reading something on purpose
  return dismissedId !== activeAssetId // they already closed this one
}

/**
 * What a founder-initiated close should record as dismissed — the generating document, or
 * nothing at all. Closing an unrelated settled document mid-cycle must not count: it would
 * suppress the auto-open they still want, for a document they never closed.
 */
export function dismissalFor(openAssetId: string | null, activeAssetId: string | null): string | null {
  return openAssetId && openAssetId === activeAssetId ? openAssetId : null
}

export function useAutoOpenLiveAsset({
  executiveId, rhythm, openAssetId, openAsset,
}: {
  executiveId: string
  rhythm: RhythmProgressState
  openAssetId: string | null
  openAsset: (assetId: string, originRect: null) => void
}): { openAssetStream: LiveStream | null; activeAssetId: string | null; recordDismissal: () => void } {
  const dismissedGeneratingId = useRef<string | null>(null)

  const activeAssetId = activeAssetIdFor(rhythm.progress?.steps ?? [], executiveId)

  useEffect(() => {
    if (!activeAssetId) { dismissedGeneratingId.current = null; return }
    if (!shouldAutoOpen(activeAssetId, openAssetId, dismissedGeneratingId.current)) return
    openAsset(activeAssetId, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openAssetId/openAsset intentionally excluded: this must fire only on activeAssetId changing, not on every render where a panel happens to already be open
  }, [activeAssetId])

  // What the currently-open panel should show live, if anything.
  //
  // ⚠️ Ownership comes from the STREAM'S OWN id, not from comparing against activeAssetId. Those
  // look equivalent and are not: activeAssetId is derived from progress, so before the fix in
  // lib/rhythm/progress.ts every executive's tab derived one, and each then rendered the single
  // unowned global stream as its own document. Asking the text who it belongs to cannot go wrong
  // that way. Everything else passes null and the panel reads the saved version as usual.
  const openAssetStream = streamOwnedBy(rhythm.activeLive, openAssetId) ? rhythm.activeLive : null

  // Called from the page's closeAsset — remembers a founder-initiated close of a still-generating
  // document, so the effect above never fights them by reopening the exact thing they just closed.
  function recordDismissal(): void {
    const dismissed = dismissalFor(openAssetId, activeAssetId)
    if (dismissed) dismissedGeneratingId.current = dismissed
  }

  return { openAssetStream, activeAssetId, recordDismissal }
}
