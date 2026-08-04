'use client'

/**
 * The Q-Score, at the centre of the Command View — everything the team works to is read
 * against it (PRD §4, "Score → Mandate → Operate").
 *
 * Deliberately just the overall number and grade, not the 6-dimension ring
 * app/founder/dashboard/page.tsx renders. That ring depends on dashboard's own IQ-v2 /
 * legacy-breakdown / demo version-resolution logic (iqParams / sortedDims / legacyDims),
 * which lives only there and isn't safe to shortcut-reimplement here without the same
 * care. If that resolution logic is ever extracted into a shared helper, this can upgrade
 * to the full segmented ring — until then, the honest overall number beats a guessed or
 * mismapped breakdown.
 */

import { ink, muted, bdr } from '@/lib/constants/colors'
import { useQScore } from '@/features/qscore/hooks/useQScore'

export function ScoreAnchor() {
  const { qScore } = useQScore()

  // Unreachable in the confirmed state in practice — a mandate can't be drafted without a
  // score (resolveJourneyState) — but stay quiet rather than render a broken centrepiece
  // if the read is ever stale.
  if (!qScore || qScore.overall <= 0) return null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '12px 0 8px',
    }}>
      <div style={{
        width: 148, height: 148, borderRadius: '50%', border: `3px solid ${bdr}`,
        display: 'grid', placeItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 600, color: ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {qScore.overall}
          </div>
          <div style={{ fontSize: 12, color: muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Q-Score{qScore.grade ? ` · ${qScore.grade}` : ''}
          </div>
        </div>
      </div>
      <p style={{ color: muted, fontSize: 13, marginTop: 12, maxWidth: 420, lineHeight: 1.5 }}>
        Everything your team works to is read against this.
      </p>
    </div>
  )
}
