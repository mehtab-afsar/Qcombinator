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

export function useAutoOpenLiveAsset({
  executiveId, rhythm, openAssetId, openAsset,
}: {
  executiveId: string
  rhythm: RhythmProgressState
  openAssetId: string | null
  openAsset: (assetId: string, originRect: null) => void
}): { openAssetLiveText: string | undefined; activeAssetId: string | null; recordDismissal: () => void } {
  const dismissedGeneratingId = useRef<string | null>(null)

  const activeAssetId = activeAssetIdFor(rhythm.progress?.steps ?? [], executiveId)

  useEffect(() => {
    if (!activeAssetId) { dismissedGeneratingId.current = null; return }
    if (openAssetId) return // a founder is already reading something on purpose — don't interrupt
    if (dismissedGeneratingId.current === activeAssetId) return // they already closed this one
    openAsset(activeAssetId, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openAssetId/openAsset intentionally excluded: this must fire only on activeAssetId changing, not on every render where a panel happens to already be open
  }, [activeAssetId])

  // What the currently-open panel should show live, if anything: only when it's open on exactly
  // the asset that's actively generating right now. Settled reads (everything else) pass
  // undefined and AssetWorkspacePanel falls back to its normal fetch-the-saved-version behavior.
  const openAssetLiveText = openAssetId && openAssetId === activeAssetId ? rhythm.activeLiveText : undefined

  // Called from the page's closeAsset — remembers a founder-initiated close of a still-generating
  // document, so the effect above never fights them by re-opening the exact thing they just closed.
  function recordDismissal(): void {
    if (openAssetId) dismissedGeneratingId.current = openAssetId
  }

  return { openAssetLiveText, activeAssetId, recordDismissal }
}
