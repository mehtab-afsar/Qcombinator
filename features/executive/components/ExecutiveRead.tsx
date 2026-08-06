'use client'

/**
 * "The Read" beat, on a non-CEO executive's tab — F09 IA restructuring.
 *
 * Deliberately just the overall Q-Score and grade, same minimal shape as ScoreAnchor.tsx, NOT a
 * domain-specific dimension claim (e.g. "Growth reads P2"). The codebase has two different,
 * contradictory P1–P6-to-executive mappings on record (dashboard/page.tsx's current
 * DIMENSION_META/DIMENSION_AGENT labels vs. older dead-adviser-era associations) — picking one
 * without confirming which is actually canonical would be inventing a claim, not reading one.
 * Flagged as a real follow-up decision, not resolved here (see the session's build report).
 *
 * Returns null when there's no score yet — this beat has nothing honest to say before that.
 */

import { useQScore } from '@/features/qscore/hooks/useQScore'
import { ink, muted, bg, bdr } from '@/lib/constants/colors'
import { BeatHeading } from './BeatHeading'

export function ExecutiveRead() {
  const { qScore } = useQScore()
  if (!qScore || qScore.overall <= 0) return null

  return (
    <div>
      <BeatHeading>The Read</BeatHeading>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: '14px 16px',
      }}>
        <span style={{ color: ink, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{qScore.overall}</span>
        <span style={{ color: muted, fontSize: 13 }}>
          Q-Score · {qScore.grade} — the score your team&rsquo;s work is read against.
        </span>
      </div>
    </div>
  )
}
