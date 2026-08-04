'use client'

/**
 * The Command View (F09) — the payoff screen once a mandate is confirmed.
 *
 * The USP made visible: the Q-Score at the centre, the mandate above it, the team below it,
 * "needs you" first among what follows. None of the panels here are rebuilt — MandateCard,
 * ExecutiveRoster, ActionsPanel, RhythmPanel, BriefingsPanel and ConnectorsPanel already
 * existed; this is composition and layout, not new machinery (CLAUDE.md §2).
 *
 * ⚠️ Same rule as the page that renders this (ADR-002): "Change direction" starts a NEW
 * mandate — it never edits the confirmed one in place, and there is no approval control
 * anywhere in this view beyond the one confirmation already spent to get here.
 */

import { useState } from 'react'
import { ScoreAnchor } from './ScoreAnchor'
import { MandateCard } from './MandateCard'
import { ExecutiveRoster } from './ExecutiveRoster'
import { ActionsPanel } from './ActionsPanel'
import { ConnectorsPanel } from './ConnectorsPanel'
import { RhythmPanel } from './RhythmPanel'
import { BriefingsPanel } from './BriefingsPanel'
import { ink, muted, bdr } from '@/lib/constants/colors'
import type { Contract, ProgramInstance } from '../types/executive.types'

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

  return (
    <div>
      <ScoreAnchor />

      <div style={{ marginTop: 8 }}>
        <MandateCard contract={contract} />
        <div style={{ marginTop: 16 }}>
          <button onClick={onChangeDirection} disabled={busy} style={changeDirectionBtn(busy)}>
            {busy ? 'Working…' : 'Change direction'}
          </button>
          <p style={{ color: muted, fontSize: 13, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
            {/* ADR-003, in the founder's language. */}
            This starts a new epoch. Your current mandate is kept exactly as it is —
            nothing is overwritten, and you can always see what you were operating
            under, and when.
          </p>
        </div>
      </div>

      {/* Who is running the mandate, then what needs YOU first (F14 — the one checkpoint),
          then the cycle, then its output, then the tools the team may act in. */}
      <ExecutiveRoster programs={programs} reveal={reveal} />
      <ActionsPanel />
      <RhythmPanel />
      <BriefingsPanel />
      <ConnectorsPanel />
    </div>
  )
}

const changeDirectionBtn = (busy: boolean): React.CSSProperties => ({
  background: 'none', color: ink, border: `1px solid ${bdr}`, borderRadius: 8,
  padding: '11px 22px', fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
})
