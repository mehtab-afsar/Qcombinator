/**
 * Product Dimension Scorer
 * Sources: Customer Evidence + Learning Velocity + Failed Assumptions sections
 * Scoring: Customer validation (40), iteration speed (30), product learning (30)
 *
 * RAG enhancement: accepts optional SemanticEvaluation to replace character-count
 * heuristics with LLM-evaluated substance scores (0–100 per field).
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';

/**
 * Map a 0–100 semantic quality score to a fraction of available points.
 * - q=0   → 0 pts
 * - q=50  → 50% of max
 * - q=100 → 100% of max
 */
/** Map 0–100 quality score to a fraction of available points. Guards against NaN/Infinity. */
function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

/**
 * Heuristic boolean-to-points fallback (used when no semantic eval available).
 * Preserves original logic so behaviour is unchanged without RAG.
 */
function boolPts(condition: boolean, pts: number): number {
  return condition ? pts : 0;
}

export function calculateProductScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation
): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;
  const sq = semanticEval?.answerQuality;

  // ── 1. Customer Validation Quality (40 points) ────────────────────────────

  // Conversation count scoring (20 pts) — unchanged, numeric, no semantic needed
  const conversationCount = data.conversationCount || 0;
  if (conversationCount >= 50) points += 20;
  else if (conversationCount >= 20) points += 16;
  else if (conversationCount >= 10) points += 12;
  else if (conversationCount >= 5) points += 8;
  else points += 4;

  // Evidence quality scoring (20 pts)
  // RAG: use LLM-evaluated substance scores instead of char-count checks
  if (sq) {
    // customerQuote quality maps to up to 8 pts
    points += semPts(sq.customerQuote ?? 0, 8);
    // customerSurprise + failedBelief jointly map to up to 12 pts (7 + 5)
    // Use customerSurprise for the "specific commitment" signal (7 pts)
    points += semPts(sq.customerSurprise ?? 0, 7);
    // Use failedBelief as proxy for "surprise / insight quality" (5 pts)
    points += semPts(sq.failedBelief ?? 0, 5);
  } else {
    // Fallback: original heuristics
    const hasCustomerEvidence = !!(data.customerQuote && data.customerQuote.length > 50);
    const hasSpecificCommitment = !!(data.customerCommitment && data.customerCommitment.length > 30);
    const hasSurprises = !!(data.customerSurprise && data.customerSurprise.length > 30);
    points += boolPts(hasCustomerEvidence, 8);
    points += boolPts(hasSpecificCommitment, 7);
    points += boolPts(hasSurprises, 5);
  }

  // ── 2. Learning Velocity & Iteration (30 points) ─────────────────────────

  // Build time scoring (10 pts) — numeric, no semantic needed
  const buildTime = data.buildTime || 0;
  if (buildTime <= 7) points += 10;
  else if (buildTime <= 14) points += 8;
  else if (buildTime <= 30) points += 6;
  else if (buildTime <= 60) points += 4;
  else points += 2;

  // Learning completeness (20 pts)
  // RAG: use semantic quality for hypothesis + discovery fields
  if (sq) {
    // tested → use failedBelief quality as proxy (shows whether they framed hypotheses)
    const testedQ = sq.failedBelief ?? 0;
    points += semPts(testedQ, 5);
    // measurement → use customerSurprise quality (shows tracking discipline)
    const measureQ = sq.customerSurprise ?? 0;
    points += semPts(measureQ, 5);
    // learned → use failedDiscovery quality
    points += semPts(sq.failedDiscovery ?? 0, 5);
    // changed → use average of discovery + belief quality
    const changedQ = ((sq.failedDiscovery ?? 0) + (sq.failedBelief ?? 0)) / 2;
    points += semPts(changedQ, 5);
  } else {
    const hasTestedHypothesis = !!(data.tested && data.tested.length > 50);
    const hasMeasurement = !!(data.measurement && data.measurement.length > 30);
    const hasLearned = !!(data.learned && data.learned.length > 50);
    const hasChanged = !!(data.changed && data.changed.length > 30);
    points += boolPts(hasTestedHypothesis, 5);
    points += boolPts(hasMeasurement, 5);
    points += boolPts(hasLearned, 5);
    points += boolPts(hasChanged, 5);
  }

  // ── 3. Failed Assumptions & Learning (30 points) ─────────────────────────
  // RAG: core semantic evaluation — this is the section most gamed by char-count
  if (sq) {
    // failedBelief (8 pts): was a specific assumption named?
    points += semPts(sq.failedBelief ?? 0, 8);
    // failedDiscovery (8 pts): was what they learned documented concretely?
    points += semPts(sq.failedDiscovery ?? 0, 8);
    // failedChange (8 pts): did they actually change direction?
    // Use average of both as proxy (no direct field for "failedChange" quality)
    const changeQ = ((sq.failedBelief ?? 0) + (sq.failedDiscovery ?? 0)) / 2;
    points += semPts(changeQ, 8);
    // failedReasoning (6 pts): why did they hold the old belief?
    points += semPts(sq.failedBelief ?? 0, 6);
  } else {
    const hasFailedAssumption = !!(data.failedBelief && data.failedBelief.length > 30);
    const hasDiscovery = !!(data.failedDiscovery && data.failedDiscovery.length > 50);
    const hasChangeResponse = !!(data.failedChange && data.failedChange.length > 50);
    const hasReasoning = !!(data.failedReasoning && data.failedReasoning.length > 30);
    points += boolPts(hasFailedAssumption, 8);
    points += boolPts(hasDiscovery, 8);
    points += boolPts(hasChangeResponse, 8);
    points += boolPts(hasReasoning, 6);
  }

  // Normalize to 0-100, clamp both ends, guard NaN
  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const score = Math.max(0, Math.min(100, raw));

  return { score, rawPoints: Math.max(0, points), maxPoints };
}
