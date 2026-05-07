/**
 * Evidence Scorer
 *
 * Adjusts answer quality scores based on evidence cross-referencing results.
 * Corroborated claims boost scores; conflicting claims reduce them.
 */

import type { AnswerQualityScores } from '../types';
import type { EvidenceContext, EvidenceItem } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Score Adjustment Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Points to add per corroborated claim on the relevant dimension field */
const CORROBORATION_BOOST = 7;

/** Points to subtract per conflicting claim on the relevant dimension field */
const CONFLICT_PENALTY = 12;

/** Map from evidence dimension to affected AnswerQualityScores fields */
const DIMENSION_FIELD_MAP: Record<string, (keyof AnswerQualityScores)[]> = {
  financial: ['advantageExplanation'],
  market: ['icpDescription', 'messagingResults'],
  product: ['customerQuote', 'customerSurprise', 'failedBelief', 'failedDiscovery'],
  traction: ['customerQuote'],
  team: ['problemStory', 'advantageExplanation'],
  gtm: ['icpDescription', 'messagingResults'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Score Adjustment
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Apply evidence-based adjustments to answer quality scores.
 *
 * @param scores - Current answer quality scores
 * @param evidence - Evidence context from cross-referencing
 * @returns Adjusted scores and human-readable evidence summary
 */
export function adjustScoresWithEvidence(
  scores: AnswerQualityScores,
  evidence: EvidenceContext
): { adjusted: AnswerQualityScores; evidenceSummary: string[] } {
  // If no evidence or cold start, return unchanged
  if (evidence.unverified === 'all' || evidence.confidence === 0) {
    return { adjusted: scores, evidenceSummary: [] };
  }

  const adjusted = { ...scores };
  const evidenceSummary: string[] = [];

  // Apply corroboration boosts
  for (const item of evidence.corroborations) {
    const dim = item.dimension ?? '';
    const fields = DIMENSION_FIELD_MAP[dim] || [];
    for (const field of fields) {
      const key = field as keyof AnswerQualityScores;
      adjusted[key] = clamp(adjusted[key] + CORROBORATION_BOOST);
    }
    evidenceSummary.push(
      `✓ "${item.claim}" corroborated by ${item.artifactType} (${Math.round(item.similarity * 100)}% match)`
    );
  }

  // Apply conflict penalties
  for (const item of evidence.conflicts) {
    const dim = item.dimension ?? '';
    const fields = DIMENSION_FIELD_MAP[dim] || [];
    for (const field of fields) {
      const key = field as keyof AnswerQualityScores;
      adjusted[key] = clamp(adjusted[key] - CONFLICT_PENALTY);
    }
    evidenceSummary.push(
      `✗ "${item.claim}" conflicts with ${item.artifactType}: ${item.evidence.slice(0, 100)}`
    );
  }

  return { adjusted, evidenceSummary };
}

/**
 * Extract bluff-detection-compatible conflict signals from evidence context.
 * Returns conflict items that should be fed into the bluff detection system.
 */
export function extractEvidenceConflicts(evidence: EvidenceContext): EvidenceItem[] {
  if (evidence.unverified === 'all') return [];
  return evidence.conflicts;
}
