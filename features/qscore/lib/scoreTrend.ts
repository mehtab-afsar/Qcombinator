/**
 * The Command View's centre (UX_SPEC §5: "the Q-Score, large, with its trend") needs honest
 * trend copy, not the spec's illustrative "this month" — `previous_score_id` points at whenever
 * the founder's prior score actually was, not a fixed monthly cadence, so "this month" would be
 * false the moment it's actually six weeks. `hasTrend` (from /api/qscore/latest) distinguishes a
 * genuinely unchanged score from a first-ever score with nothing to compare against — the latter
 * must render nothing, never a fabricated "steady."
 */
export function formatScoreTrend(change: number, hasTrend: boolean | undefined): string | null {
  if (!hasTrend) return null
  if (change > 0) return `up ${change} since your last update`
  if (change < 0) return `down ${Math.abs(change)} since your last update`
  return 'steady since your last update'
}
