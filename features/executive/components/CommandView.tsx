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

import { ScoreAnchor } from './ScoreAnchor'
import { MandateCard } from './MandateCard'
import { ExecutiveRoster } from './ExecutiveRoster'
import { ActionsPanel } from './ActionsPanel'
import { ConnectorsPanel } from './ConnectorsPanel'
import { RhythmPanel } from './RhythmPanel'
import { BriefingsPanel } from './BriefingsPanel'
import { ink, muted, bdr } from '@/lib/constants/colors'
import type { Contract, ProgramInstance } from '../types/executive.types'

export function CommandView({
  contract, programs, onChangeDirection, busy,
}: {
  contract: Contract
  programs: ProgramInstance[]
  onChangeDirection: () => void
  busy: boolean
}) {
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
      <ExecutiveRoster programs={programs} />
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
