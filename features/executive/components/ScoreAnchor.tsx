'use client'

/**
 * The Q-Score, at the centre of the Command View — everything the team works to is read
 * against it (PRD §4, "Score → Mandate → Operate"). UX_SPEC §5: "the Q-Score, large, with its
 * trend. Everything orbits it."
 *
 * Composes `QScoreDial` (features/qscore/components/QScoreDial.tsx) — the one ring-drawing
 * component in this app, already animated/band-colored, used on the dashboard — rather than
 * hand-rolling a second one. This file owns the composition around it: grade, trend line,
 * spacing for this page.
 *
 * Deliberately just the overall number, grade and trend — not a 6-dimension breakdown. That
 * depends on dashboard's own IQ-v2/legacy/demo version-resolution logic (iqParams/sortedDims/
 * legacyDims), which lives only there and isn't safe to shortcut-reimplement here. If that
 * resolution logic is ever extracted into a shared helper, this can grow a segmented view —
 * until then, the honest overall number beats a guessed or mismapped breakdown.
 */

import { muted } from '@/lib/constants/colors'
import { useQScore } from '@/features/qscore/hooks/useQScore'
import { QScoreDial } from '@/features/qscore/components/QScoreDial'
import { formatScoreTrend } from '@/features/qscore/lib/scoreTrend'

export function ScoreAnchor() {
  const { qScore } = useQScore()

  // Unreachable in the confirmed state in practice — a mandate can't be drafted without a
  // score (resolveJourneyState) — but stay quiet rather than render a broken centrepiece
  // if the read is ever stale.
  if (!qScore || qScore.overall <= 0) return null

  const trend = formatScoreTrend(qScore.change ?? 0, qScore.hasTrend)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '12px 0 8px',
    }}>
      <QScoreDial score={qScore.overall} size={176} />
      <p style={{ color: muted, fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
        {qScore.grade && `Grade ${qScore.grade}`}
        {qScore.grade && trend && ' · '}
        {trend}
      </p>
    </div>
  )
}
