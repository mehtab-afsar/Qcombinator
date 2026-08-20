'use client'

/**
 * The Command View (F09) — the payoff screen once a mandate is confirmed.
 *
 * UX_SPEC §5's hierarchy: the mandate on top, one quiet line; the Q-Score large at centre with
 * its trend, the team around it; this week's briefing, in the team's own voice; then the one
 * thing waiting on you. Documents, the cycle control, and connected tools follow — real and
 * necessary, just not part of that emotional arc.
 *
 * PRD 2 Stage 3 — ScoreAnchor is no longer rendered here. An earlier version of this file
 * claimed "Q-Score at the centre, team around it" while actually being a plain vertical stack
 * (ScoreAnchor, then ExecutiveRoster's grid, below it) — ExecutiveRoster now owns composing the
 * centre WITH the team itself (a real radial arrangement on a wide viewport, CANVAS_SPEC D2),
 * so this only needs to render the roster once, not the two pieces separately.
 *
 * None of the panels here are rebuilt — MandateCard, ExecutiveRoster, ActionsPanel, RhythmPanel,
 * BriefingsPanel and ConnectorsPanel already existed; this is composition and layout, not new
 * machinery (CLAUDE.md §2).
 *
 * ⚠️ Same rule as the page that renders this (ADR-002): "Change direction" starts a NEW
 * mandate — it never edits the confirmed one in place, and there is no approval control
 * anywhere in this view beyond the one confirmation already spent to get here.
 */

import { useEffect, useState } from 'react'
import { MandateCard } from './MandateCard'
import { ExecutiveRoster } from './ExecutiveRoster'
import { AssetsPanel } from './AssetsPanel'
import { ActionsPanel } from './ActionsPanel'
import { ConnectorsPanel } from './ConnectorsPanel'
import { RhythmPanel } from './RhythmPanel'
import { BriefingsPanel } from './BriefingsPanel'
import { useRhythmProgress } from '../hooks/useRhythmProgress'
import { space } from '@/features/shared/tokens'
import type { Contract, ProgramInstance } from '../types/executive.types'

interface AssetVersionSummary { version: number; createdAt: string; updateReason: string | null }
export interface AssetSummary {
  id: string
  name: string
  outputSchema: 'markdown' | 'json'
  executiveId: string | null
  /** The Registry Program id, e.g. 'P001' — mirrors ArtifactCardData's own field. */
  programTemplateId: string | null
  asset: AssetVersionSummary | null
}

/**
 * Has THIS contract's team-assembly reveal already played? Keyed by contract id, not
 * founder id — a new epoch (a new contract) reasonably earns its own "the team re-forms
 * around your new direction" moment. localStorage, not a DB column: this is a one-time
 * visual flourish, not a fact worth a migration or a write to an otherwise-immutable
 * contract row. Wrapped in try/catch — privacy mode or a disabled localStorage must
 * never crash the page over an animation; worst case, the reveal just plays again.
 */
function firstLandingOnThisContract(contractId: string): boolean {
  try {
    const key = `command-view-revealed:${contractId}`
    if (window.localStorage.getItem(key)) return false
    window.localStorage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}

export function CommandView({
  contract, programs, onChangeDirection, busy,
}: {
  contract: Contract
  programs: ProgramInstance[]
  onChangeDirection: () => void
  busy: boolean
}) {
  // Lazy initializer: runs once, synchronously, on this component's first render — so
  // ExecutiveRoster's `initial` prop (read only at mount, per framer-motion) already
  // reflects the real answer instead of flipping after an effect and missing the animation.
  const [reveal] = useState(() => firstLandingOnThisContract(contract.id))

  // This page has no AssetWorkspacePanel to share it with (unlike the executive detail page,
  // which calls useRhythmProgress once and threads it to both RhythmPanel and the auto-opening
  // document panel) — a standalone call here is correct, not a duplicate of anything.
  const progressState = useRhythmProgress()

  // Owned here, not self-fetched like the other panels below: the compact-vs-full decision on
  // MandateCard needs the same data AssetsPanel renders, so this is the one fetch both read
  // from, rather than a duplicate request just to answer "do any assets exist yet."
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [assetsLoaded, setAssetsLoaded] = useState(false)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/assets')
        if (res.ok && live) setAssets((await res.json()).assets ?? [])
      } catch {
        /* fail quiet — a secondary surface on a page that already shows the mandate */
      } finally {
        if (live) setAssetsLoaded(true)
      }
    })()
    return () => { live = false }
  }, [contract.id])

  return (
    <div>
      {/* Top: the mandate, one quiet line — always compact now. The centre zone below it is
          the thing to land on from the first confirmed mandate, documents or not, so there's
          no longer a "fuller card while waiting for documents" branch to choose between. */}
      <MandateCard contract={contract} compact onChangeDirection={onChangeDirection} busy={busy} />

      {/* Centre: the Q-Score, with its trend. Around it: the team — one composed zone, owned
          entirely by ExecutiveRoster now (radial on a wide viewport, stacked below the dial
          on a narrow one). */}
      <div style={{ marginTop: 24 }}>
        <ExecutiveRoster programs={programs} reveal={reveal} />
      </div>

      <div style={{ marginTop: space[5], display: 'flex', flexDirection: 'column', gap: space[5] }}>
        {/* Below: this week's briefing, in the team's own voice — then the one thing waiting
            on you (F14 — the one checkpoint in the product). */}
        <BriefingsPanel />
        <ActionsPanel />

        {/* Real and necessary, not part of that emotional arc: the documents themselves, the
            cycle control, and connected tools. */}
        <AssetsPanel assets={assets} loaded={assetsLoaded} />
        <RhythmPanel progressState={progressState} />
        <ConnectorsPanel />
      </div>
    </div>
  )
}
