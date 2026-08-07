'use client'

/**
 * F09 artifact organization, Stage 4 — one executive's own documents, on their own page.
 *
 * Closes a specific gap: landing directly on /founder/executive/[executiveId] showed that
 * executive's Actions, this week's cycle, and Briefings, but never its documents — the founder
 * had to go back to the CEO tab's compact grid (or the Documents Hub) to see what this executive
 * actually produced. Same self-fetching, executiveId-scoped pattern already established three
 * times on this page (ActionsPanel, RhythmPanel, BriefingsPanel) — not a new convention.
 *
 * Fails quiet (renders nothing) when there's genuinely nothing to show — the page's own "The
 * Mandate" beat above this already explains "no active program yet" honestly; this panel isn't
 * the place to repeat that.
 */

import { useEffect, useState } from 'react'
import { blue, alpha } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { ArtifactCard, type ArtifactCardData } from './ArtifactCard'

export function ProgramAssetsPanel({
  executiveId, onOpenAsset,
}: {
  executiveId: string
  /** CANVAS_SPEC §5 — when supplied, clicking a document opens the node workspace panel in
   *  place instead of navigating away. Passed straight through to ArtifactCard. */
  onOpenAsset?: (assetId: string) => void
}) {
  const [assets, setAssets] = useState<ArtifactCardData[] | null>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/assets')
        if (!live) return
        if (!res.ok) { setAssets([]); return }
        const all: ArtifactCardData[] = (await res.json()).assets ?? []
        setAssets(all.filter(a => a.executiveId === executiveId))
      } catch {
        if (live) setAssets([])
      }
    })()
    return () => { live = false }
  }, [executiveId])

  if (!assets || assets.length === 0) return null

  return (
    <SectionCard title="Documents" style={{ background: alpha(blue, 0.04) }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {assets.map(a => <ArtifactCard key={a.id} data={a} onOpen={onOpenAsset} />)}
      </div>
    </SectionCard>
  )
}
