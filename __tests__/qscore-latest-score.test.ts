/**
 * features/qscore/services/latest-score.ts — the shared read Feature B extracted out of
 * lib/mandate/strategy-proposal.ts so lib/rhythm/context.ts could reuse it instead of a third
 * inline copy of the same query.
 */

import { getLatestScoreSummary, getScoreHistory } from '@/features/qscore/services/latest-score'

const FOUNDER = 'f1'

function fakeSupabase(rows: Record<string, unknown> | Record<string, unknown>[] | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: (n: number) => {
              const list = Array.isArray(rows) ? rows.slice(0, n) : rows ? [rows] : []
              return {
                maybeSingle: () => Promise.resolve({ data: list[0] ?? null, error: null }),
                then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
                  resolve({ data: list, error: null }),
              }
            },
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof getLatestScoreSummary>[0]
}

describe('getLatestScoreSummary', () => {
  it('returns null when the founder has no score yet', async () => {
    expect(await getLatestScoreSummary(fakeSupabase(null), FOUNDER)).toBeNull()
  })

  it('summarises weakest and strongest dimension, nothing invented', async () => {
    const result = await getLatestScoreSummary(
      fakeSupabase({ overall_score: 62, p1_score: 78, p2_score: 32, p3_score: 55, p4_score: 61, p5_score: 40, p6_score: 70 }),
      FOUNDER,
    )
    expect(result).toEqual({
      overall: 62,
      summary: 'Weakest: Market Potential (32). Strongest: Market Readiness (78).',
    })
  })

  it('a single non-null dimension summarises as just that dimension', async () => {
    const result = await getLatestScoreSummary(
      fakeSupabase({ overall_score: 50, p1_score: 50, p2_score: null, p3_score: null, p4_score: null, p5_score: null, p6_score: null }),
      FOUNDER,
    )
    expect(result?.summary).toBe('Market Readiness: 50')
  })

  it('no scored dimensions at all summarises as an empty string, never invented text', async () => {
    const result = await getLatestScoreSummary(
      fakeSupabase({ overall_score: 0, p1_score: null, p2_score: null, p3_score: null, p4_score: null, p5_score: null, p6_score: null }),
      FOUNDER,
    )
    expect(result?.summary).toBe('')
  })
})

describe('getScoreHistory', () => {
  it('returns an empty array when there is no history', async () => {
    expect(await getScoreHistory(fakeSupabase([]), FOUNDER)).toEqual([])
  })

  it('reverses the newest-first DB order to oldest-first for a trend narrative', async () => {
    const result = await getScoreHistory(
      fakeSupabase([
        { overall_score: 62, calculated_at: '2026-08-20T00:00:00Z' },
        { overall_score: 55, calculated_at: '2026-08-01T00:00:00Z' },
      ]),
      FOUNDER,
    )
    expect(result).toEqual([
      { overall: 55, calculatedAt: '2026-08-01T00:00:00Z' },
      { overall: 62, calculatedAt: '2026-08-20T00:00:00Z' },
    ])
  })

  it('respects a custom cap', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      overall_score: i, calculated_at: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }))
    const result = await getScoreHistory(fakeSupabase(rows), FOUNDER, 3)
    expect(result).toHaveLength(3)
  })
})
