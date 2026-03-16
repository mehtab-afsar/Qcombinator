/**
 * Score Blender — Confidence-Weighted Merging
 *
 * Blends RAG-scored and heuristic-scored answer quality results based on
 * confidence level. Per-field blending ensures partial RAG results don't
 * pollute fields that weren't successfully scored.
 *
 * Confidence thresholds:
 *   < 0.3  → 100% heuristic
 *   0.3–0.6 → 50/50 blend
 *   > 0.6  → 70% RAG / 30% heuristic
 */

import { AnswerQualityScores } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BlendConfig {
  ragWeight: number;      // 0-1, how much to weight RAG scores
  heuristicWeight: number; // 0-1, complement of ragWeight
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence → Blend Weights
// ─────────────────────────────────────────────────────────────────────────────

export function getBlendWeights(confidence: number): BlendConfig {
  if (confidence < 0.3) {
    return { ragWeight: 0, heuristicWeight: 1 };
  }
  if (confidence <= 0.6) {
    return { ragWeight: 0.5, heuristicWeight: 0.5 };
  }
  return { ragWeight: 0.7, heuristicWeight: 0.3 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Blender
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS: (keyof AnswerQualityScores)[] = [
  'problemStory',
  'advantageExplanation',
  'customerQuote',
  'customerSurprise',
  'failedBelief',
  'failedDiscovery',
  'icpDescription',
  'messagingResults',
];

/**
 * Blend RAG scores with heuristic scores using confidence-weighted mixing.
 *
 * Per-field: if the RAG score for a field is the default sentinel (15),
 * that field falls back to 100% heuristic regardless of overall confidence.
 *
 * @param ragScores - Scores from rubric-aware LLM evaluation
 * @param heuristicScores - Scores from character-count + specificity heuristics
 * @param confidence - Overall confidence in RAG scoring (0-1)
 * @returns Blended AnswerQualityScores
 */
export function blendScores(
  ragScores: Partial<AnswerQualityScores>,
  heuristicScores: AnswerQualityScores,
  confidence: number
): AnswerQualityScores {
  const { ragWeight, heuristicWeight } = getBlendWeights(confidence);

  const result = { ...heuristicScores };

  // If confidence is below threshold, return pure heuristic
  if (ragWeight === 0) {
    return result;
  }

  for (const field of FIELDS) {
    const ragScore = ragScores[field];
    const heuristicScore = heuristicScores[field];

    // If RAG didn't score this field (undefined or sentinel value), keep heuristic
    if (ragScore === undefined || ragScore === 15) {
      continue;
    }

    // Weighted blend
    result[field] = Math.round(
      ragScore * ragWeight + heuristicScore * heuristicWeight
    );
  }

  return result;
}

/**
 * Calculate RAG confidence from the number of fields successfully scored.
 *
 * @param ragScores - Partial scores from rubric scorer
 * @param totalFields - Total fields that were submitted for scoring
 * @returns Confidence value 0-1
 */
export function calculateRAGConfidence(
  ragScores: Partial<AnswerQualityScores>,
  totalFields: number
): number {
  if (totalFields === 0) return 0;

  const scoredCount = FIELDS.filter(f => {
    const score = ragScores[f];
    return score !== undefined && score !== 15;
  }).length;

  return scoredCount / totalFields;
}
