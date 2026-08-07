import { formatScoreTrend } from '@/features/qscore/lib/scoreTrend'

describe('formatScoreTrend', () => {
  it('returns null when hasTrend is false, regardless of change — never fabricates a first trend', () => {
    expect(formatScoreTrend(6, false)).toBeNull()
    expect(formatScoreTrend(-3, false)).toBeNull()
    expect(formatScoreTrend(0, false)).toBeNull()
  })

  it('returns null when hasTrend is undefined (the localStorage fallback path)', () => {
    expect(formatScoreTrend(6, undefined)).toBeNull()
  })

  it('a positive change with a real trend reads "up N"', () => {
    expect(formatScoreTrend(6, true)).toBe('up 6 since your last update')
  })

  it('a negative change with a real trend reads "down N", using the absolute value', () => {
    expect(formatScoreTrend(-4, true)).toBe('down 4 since your last update')
  })

  it('a zero change with a real trend reads "steady" — this is the one case that is genuinely unmoved', () => {
    expect(formatScoreTrend(0, true)).toBe('steady since your last update')
  })
})
