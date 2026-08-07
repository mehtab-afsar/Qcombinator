/**
 * Time-decay applied to a Q-Score for investor-facing display — a score loses
 * confidence the longer it's gone unrefreshed since its last calculation.
 * Display-only: never affects the stored score or triggers a recalculation.
 */

export interface DecayedScore {
  /** The decayed score, floored at 1 so a stale score never displays as 0. */
  score: number
  daysSince: number
}

const DECAY_TIERS: Array<{ maxDays: number; factor: number }> = [
  { maxDays: 90,  factor: 1.00 },
  { maxDays: 180, factor: 0.975 },
  { maxDays: 270, factor: 0.95 },
  { maxDays: 365, factor: 0.90 },
]
const DECAY_FLOOR = 0.80

export function applyScoreDecay(overallScore: number, calculatedAt: string): DecayedScore {
  const daysSince = Math.floor((Date.now() - new Date(calculatedAt).getTime()) / 86_400_000)
  const factor = DECAY_TIERS.find(t => daysSince < t.maxDays)?.factor ?? DECAY_FLOOR
  return { score: Math.max(1, Math.round(overallScore * factor)), daysSince }
}
