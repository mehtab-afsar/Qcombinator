/**
 * "2m 14s", "45s" — the "running for..." ticker on a live cycle (RhythmPanel.tsx). Never
 * rounds up to a misleadingly-tidy unit, since this is read while it's actively still ticking,
 * not a fixed duration after the fact.
 *
 * Plain TS, no JSX — RhythmStepList.tsx imports react-markdown, which this repo's Jest config
 * doesn't transform, so a pure helper used by both a test and that component has to live
 * outside it to stay unit-testable.
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}
