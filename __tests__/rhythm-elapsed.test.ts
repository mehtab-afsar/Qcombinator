/**
 * formatElapsed — the "running for Nm Ns" ticker on a live cycle (RhythmStepList.tsx). Added
 * so a long, multi-program cycle reads as "still working" between polls rather than "stalled" —
 * see RhythmPanel.tsx's own comment for why this is elapsed time, deliberately never an
 * estimated time remaining (step duration varies too much to guess honestly).
 */

import { formatElapsed } from '@/features/executive/lib/format-elapsed'

describe('formatElapsed', () => {
  it('shows seconds only under a minute', () => {
    expect(formatElapsed(0)).toBe('0s')
    expect(formatElapsed(45_000)).toBe('45s')
    expect(formatElapsed(59_000)).toBe('59s')
  })

  it('shows minutes and seconds once a minute has passed', () => {
    expect(formatElapsed(60_000)).toBe('1m 0s')
    expect(formatElapsed(134_000)).toBe('2m 14s')
  })

  it('floors partial seconds rather than rounding up to a value not yet reached', () => {
    expect(formatElapsed(1_999)).toBe('1s')
    expect(formatElapsed(59_999)).toBe('59s')
  })

  it('never goes negative on a clock skew between poll and tick', () => {
    expect(formatElapsed(-500)).toBe('0s')
  })
})
