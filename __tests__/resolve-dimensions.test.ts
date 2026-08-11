/**
 * The P1–P6 dimension resolution priority (IQ v2 params → legacy breakdown → demo), extracted
 * from app/founder/dashboard/page.tsx so a second Q-Score view (a dashboard tab, a per-executive
 * "Read" beat) can reuse it instead of reimplementing it — see ScoreAnchor.tsx's own comment
 * naming this exact extraction as the blocker to that. Pure — no IO, no client.
 */

import { resolveDimensions, findDimension, type DimensionTuple } from '@/features/qscore/utils/resolveDimensions'

const demoDims: DimensionTuple[] = [
  ['p1', { score: 54, change: 2, trend: 'up' }],
  ['p2', { score: 38, change: -1, trend: 'down' }],
  ['p3', { score: 71, change: 5, trend: 'up' }],
  ['p4', { score: 78, change: 3, trend: 'up' }],
  ['p5', { score: 49, change: 1, trend: 'up' }],
  ['p6', { score: 45, change: 0, trend: 'neutral' }],
]

describe('resolveDimensions — priority chain', () => {
  it('prefers IQ v2 params when present, worst-first', () => {
    const result = resolveDimensions({
      iqParams: [
        { id: 'p1', averageScore: 4 },   // -> 80
        { id: 'p2', averageScore: 1.5 }, // -> 30
        { id: 'p3', averageScore: 3 },   // -> 60
      ],
      legacyBreakdown: { marketReadiness: { score: 99 } }, // must be ignored — IQ params win
      demoDims,
    })
    expect(result.map(([id]) => id)).toEqual(['p2', 'p3', 'p1']) // sorted worst-first
    expect(result.find(([id]) => id === 'p1')![1]).toEqual({ score: 80, change: 0, trend: 'neutral' })
  })

  it('falls back to the legacy breakdown when there are no IQ v2 params — keyed exactly as app/api/qscore/latest/route.ts shapes it', () => {
    const result = resolveDimensions({
      iqParams: [],
      legacyBreakdown: {
        marketReadiness:  { score: 60, change: 2, trend: 'up' },
        marketPotential:  { score: 20, change: -3, trend: 'down' },
        ipDefensibility:  { score: 40 },
        founderTeam:      { score: 90 },
        structuralImpact: { score: 55 },
        financials:       { score: 30 },
      },
      demoDims,
    })
    // marketReadiness->p1, marketPotential->p2, ipDefensibility->p3, founderTeam->p4, structuralImpact->p5, financials->p6
    expect(result[0]).toEqual(['p2', { score: 20, change: -3, trend: 'down' }])
    expect(result.find(([id]) => id === 'p1')![1]).toEqual({ score: 60, change: 2, trend: 'up' })
  })

  it('falls back to demo content only when there is no real score at all', () => {
    const result = resolveDimensions({ iqParams: [], legacyBreakdown: undefined, demoDims })
    expect(result).toEqual([...demoDims].sort((a, b) => a[1].score - b[1].score))
  })

  it('an empty-but-present legacy breakdown object ({}) still counts as "legacy data present" — matches the original dashboard behavior byte-for-byte, not a new judgment call', () => {
    // realQScore?.breakdown truthy (even {}) was the ORIGINAL dashboard code's exact condition
    // (`const _lb = realQScore?.breakdown; ... _lb ? [...6 zero-filled entries...] : []`) —
    // Stage 0 is a pure extraction, so this preserves that quirk rather than "fixing" it.
    const result = resolveDimensions({ iqParams: [], legacyBreakdown: {}, demoDims })
    expect(result.every(([, d]) => d.score === 0 && d.trend === 'neutral')).toBe(true)
    expect(result).toHaveLength(6)
  })

  it('legacy fields missing sub-values default safely (score 0, neutral)', () => {
    const result = resolveDimensions({
      iqParams: [],
      legacyBreakdown: { marketReadiness: {} },
      demoDims,
    })
    expect(result.find(([id]) => id === 'p1')![1]).toEqual({ score: 0, change: 0, trend: 'neutral' })
  })
})

describe('findDimension', () => {
  it('reads one resolved dimension out of the set', () => {
    expect(findDimension(demoDims, 'p3')).toEqual({ score: 71, change: 5, trend: 'up' })
  })

  it('returns null for a dimension not present in the set', () => {
    expect(findDimension([], 'p1')).toBeNull()
  })
})
