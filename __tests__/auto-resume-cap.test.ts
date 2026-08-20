/**
 * shouldAutoResume (features/executive/hooks/useRhythmProgress.ts) — the cap on how many times
 * a stalled run gets auto-resumed before falling back to the existing manual "stalled — click
 * Resume" UI. Pure, so it's tested directly rather than through the hook (no hook-rendering
 * library in this repo — same convention as activeAssetIdFor).
 */

import { shouldAutoResume } from '@/features/executive/hooks/useRhythmProgress'

describe('shouldAutoResume', () => {
  it('allows an attempt while under the cap', () => {
    expect(shouldAutoResume(0)).toBe(true)
    expect(shouldAutoResume(1)).toBe(true)
    expect(shouldAutoResume(2)).toBe(true)
  })

  it('stops at the default cap (3) — falls back to the manual button', () => {
    expect(shouldAutoResume(3)).toBe(false)
    expect(shouldAutoResume(4)).toBe(false)
  })

  it('respects a custom cap', () => {
    expect(shouldAutoResume(1, 1)).toBe(false)
    expect(shouldAutoResume(0, 1)).toBe(true)
  })
})
