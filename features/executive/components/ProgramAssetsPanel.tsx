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
 *
 * Documents come from the shared workspace rather than a fetch of its own. This panel used to
 * read /api/assets once on mount with deps [executiveId, programTemplateId] and never again, so
 * mid-cycle it showed a snapshot from whenever the founder arrived — every card frozen at "Not
 * generated yet" while one "Writing now…" badge walked down the list, for eleven minutes.
 */

import { blue, alpha } from '@/lib/constants/colors'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'
import { ArtifactCard } from './ArtifactCard'
import type { Rect } from '../lib/panel-origin'

export function ProgramAssetsPanel({
  executiveId, onOpenAsset, programTemplateId, activeAssetId,
}: {
  executiveId: string
  /** CANVAS_SPEC §5 — when supplied, clicking a document opens the node workspace panel in
   *  place instead of navigating away. Passed straight through to ArtifactCard, including the
   *  clicked card's own rect (PRD 2 Stage 3 — the panel grows out of it). */
  onOpenAsset?: (assetId: string, originRect: Rect) => void
  /** Narrow to one Program (e.g. 'P001') on a multi-Program executive's page. Additive — omitted
   *  means "every Program," the same behavior this panel always had. */
  programTemplateId?: string
  /** From useAutoOpenLiveAsset — whichever asset is actively generating right now, if any.
   *  Cross-referenced against each card's own id to show a "Writing now…" badge. */
  activeAssetId?: string | null
}) {
  const { assets: all, assetsLoaded } = useExecutiveWorkspace()
  const assets = all.filter(a =>
    a.executiveId === executiveId && (!programTemplateId || a.programTemplateId === programTemplateId),
  )

  if (!assetsLoaded || assets.length === 0) return null

  return (
    <SectionCard title="Documents" style={{ background: alpha(blue, 0.04) }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {assets.map(a => (
          <ArtifactCard key={a.id} data={{ ...a, generating: a.id === activeAssetId }} onOpen={onOpenAsset} />
        ))}
      </div>
    </SectionCard>
  )
}
