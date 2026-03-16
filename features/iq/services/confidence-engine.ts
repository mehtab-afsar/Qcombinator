/**
 * Confidence Engine
 * Combines data source confidence + consistency flag penalties
 * into a final effective score per indicator.
 *
 * Formula: effectiveScore = rawScore × finalConfidence
 * finalConfidence = sourceConfidence × Π(flagPenalties)
 * Floor: 0.30 (never reduce a non-excluded indicator below 30% confidence)
 */

import {
  DataSource,
  ConsistencyFlag,
  CONFIDENCE_MAP,
  FLAG_CONFIDENCE_PENALTY,
} from '../types/iq.types';

export interface EffectiveScoreResult {
  effectiveScore: number;   // rawScore × finalConfidence
  finalConfidence: number;  // 0.30–1.0
  sourceConfidence: number; // from CONFIDENCE_MAP
  flagPenalty: number;      // combined multiplier from flags (0.49–1.0)
}

/**
 * Compute effective score for one indicator.
 * - Excluded indicators always return effectiveScore=0, confidence=0
 * - Confidence floor: 0.30 (never penalise below 30%)
 */
export function computeEffectiveScore(
  rawScore: number,
  source: DataSource,
  consistencyFlags: ConsistencyFlag[]
): EffectiveScoreResult {
  // Excluded indicators contribute nothing
  if (source === 'excluded') {
    return {
      effectiveScore: 0,
      finalConfidence: 0,
      sourceConfidence: 0,
      flagPenalty: 1,
    };
  }

  const sourceConfidence = CONFIDENCE_MAP[source];

  // Apply flag penalties multiplicatively
  let flagPenalty = 1.0;
  for (const flag of consistencyFlags) {
    flagPenalty *= FLAG_CONFIDENCE_PENALTY[flag.severity];
  }

  // Clamp: floor at 0.30 to prevent excessive penalisation
  const rawConfidence = sourceConfidence * flagPenalty;
  const finalConfidence = Math.max(0.30, Math.min(1.0, rawConfidence));

  // Guard: rawScore must be 1–5
  const clampedScore = Math.max(1, Math.min(5, isFinite(rawScore) ? rawScore : 1));
  const effectiveScore = clampedScore * finalConfidence;

  return {
    effectiveScore,
    finalConfidence,
    sourceConfidence,
    flagPenalty,
  };
}

/**
 * Aggregate effective scores for a single parameter.
 * Excluded indicators are removed from the denominator (weight normalized).
 */
export function aggregateParameterScore(
  indicators: Array<{
    effectiveScore: number;
    excluded: boolean;
    weight?: number;   // optional per-indicator weight (default 1/N equal weights)
  }>
): number {
  const active = indicators.filter(i => !i.excluded && i.effectiveScore > 0);
  if (active.length === 0) return 0;

  const totalWeight = active.reduce((s, i) => s + (i.weight ?? 1), 0);
  if (totalWeight === 0) return 0;

  const weighted = active.reduce(
    (s, i) => s + i.effectiveScore * (i.weight ?? 1),
    0
  );

  return weighted / totalWeight;
}

/**
 * Normalize a 0–5 IQ score to 0–100 for display.
 */
export function normalizeIQScore(score05: number): number {
  return Math.round(Math.max(0, Math.min(100, (score05 / 5) * 100)));
}
