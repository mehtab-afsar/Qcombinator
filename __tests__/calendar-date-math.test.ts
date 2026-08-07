/**
 * isTodayOrFuture — the one genuinely new decision rule behind the Academy year
 * calendar's green "future event" marker (blue is reserved for today itself).
 */

import { isTodayOrFuture } from '@/features/academy/lib/calendarDate'

describe('isTodayOrFuture', () => {
  it('counts today itself as future', () => {
    expect(isTodayOrFuture('2026-08-07', '2026-08-07')).toBe(true)
  })

  it('counts a later date as future', () => {
    expect(isTodayOrFuture('2026-08-08', '2026-08-07')).toBe(true)
  })

  it('does not count an earlier date as future', () => {
    expect(isTodayOrFuture('2026-08-06', '2026-08-07')).toBe(false)
  })

  it('handles a year boundary correctly via lexicographic string comparison', () => {
    expect(isTodayOrFuture('2027-01-01', '2026-12-31')).toBe(true)
    expect(isTodayOrFuture('2026-12-31', '2027-01-01')).toBe(false)
  })

  it('defaults todayKey to the real current date when not supplied', () => {
    const farFuture = '9999-12-31'
    expect(isTodayOrFuture(farFuture)).toBe(true)
    const farPast = '0001-01-01'
    expect(isTodayOrFuture(farPast)).toBe(false)
  })
})
