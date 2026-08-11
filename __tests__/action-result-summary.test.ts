/**
 * Gap B (FU-009 continuation) — a reversible internal Action's real analysis (lib/actions/
 * generate.ts's `result.summary`) reaching the founder, not silently staying server-side.
 * `resultSummary` is the one place that reads it back out — pure, unit-tested directly rather
 * than only reachable through the full GET /api/actions handler (matches attachOwners).
 */

import { resultSummary } from '@/app/api/actions/route'

describe('resultSummary', () => {
  it('reads a real analysis out of an internal Action\'s result', () => {
    expect(resultSummary({ kind: 'internal_analysis', completed: true, summary: 'Segment A fits best.' }))
      .toBe('Segment A fits best.')
  })

  it('null — no result at all (never run)', () => {
    expect(resultSummary(null)).toBeNull()
    expect(resultSummary(undefined)).toBeNull()
  })

  it('null — an irreversible Action\'s result (that path never sets one)', () => {
    expect(resultSummary({})).toBeNull()
  })

  it('null — a blank/whitespace-only summary is treated as absent, not shown as empty text', () => {
    expect(resultSummary({ summary: '   ' })).toBeNull()
  })

  it('null — a non-string summary is ignored rather than rendered raw', () => {
    expect(resultSummary({ summary: 42 })).toBeNull()
  })
})
