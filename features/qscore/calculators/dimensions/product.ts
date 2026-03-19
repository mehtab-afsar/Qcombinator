/**
 * Product Dimension Scorer
 * Sources: Customer Evidence + Learning Velocity + Failed Assumptions sections
 *
 * RAG enhancement: uses LLM-evaluated substance scores for narrative fields.
 * Numeric thresholds (conversation count, build time) are DB-driven.
 */

import { AssessmentData } from '../../types/qscore.types';
import { SemanticEvaluation } from '../../rag/types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';
import { scoreP3IPDefensibility } from '../parameters/p3-ip-defensibility';

function semPts(qualityScore: number, maxPts: number): number {
  const q = isFinite(qualityScore) && !isNaN(qualityScore) ? qualityScore : 0;
  return Math.max(0, Math.round((Math.max(0, Math.min(100, q)) / 100) * maxPts));
}

function boolPts(condition: boolean, pts: number): number {
  return condition ? pts : 0;
}

export function calculateProductScore(
  data: AssessmentData,
  semanticEval?: SemanticEvaluation,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  let points = 0;
  const maxPoints = 100;
  const sq = semanticEval?.answerQuality;
  const t = thresholds ?? new Map();

  // 1. Customer Validation (40 pts)

  // Conversation count (20 pts) — numeric, DB-driven
  const conversationCount = data.conversationCount || 0;
  const ccTiers = getTiers(t, 'product', 'conversation_count');
  if (ccTiers) {
    points += scoreTiers(conversationCount, ccTiers);
  } else {
    if (conversationCount >= 50) points += 20;
    else if (conversationCount >= 20) points += 16;
    else if (conversationCount >= 10) points += 12;
    else if (conversationCount >= 5) points += 8;
    else points += 4;
  }

  // Evidence quality (20 pts) — LLM-evaluated
  if (sq) {
    points += semPts(sq.customerQuote ?? 0, 8);
    points += semPts(sq.customerSurprise ?? 0, 7);
    points += semPts(sq.failedBelief ?? 0, 5);
  } else {
    const hasCustomerEvidence = !!(data.customerQuote && data.customerQuote.length > 50);
    const hasSpecificCommitment = !!(data.customerCommitment && data.customerCommitment.length > 30);
    const hasSurprises = !!(data.customerSurprise && data.customerSurprise.length > 30);
    points += boolPts(hasCustomerEvidence, 8);
    points += boolPts(hasSpecificCommitment, 7);
    points += boolPts(hasSurprises, 5);
  }

  // 2. Learning Velocity (30 pts)

  // Build time (10 pts) — numeric, DB-driven (lower is better)
  const buildTime = data.buildTime || 0;
  if (buildTime > 0) {
    const btTiers = getTiers(t, 'product', 'build_time_days');
    if (btTiers) {
      points += scoreTiers(buildTime, btTiers);
    } else {
      if (buildTime <= 7) points += 10;
      else if (buildTime <= 14) points += 8;
      else if (buildTime <= 30) points += 6;
      else if (buildTime <= 60) points += 4;
      else points += 2;
    }
  } else {
    points += 5; // unknown build time — neutral
  }

  // Learning completeness (20 pts) — LLM-evaluated
  if (sq) {
    points += semPts(sq.failedBelief ?? 0, 5);
    points += semPts(sq.customerSurprise ?? 0, 5);
    points += semPts(sq.failedDiscovery ?? 0, 5);
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

  // 3. Failed Assumptions & Learning (30 pts) — LLM-evaluated
  if (sq) {
    points += semPts(sq.failedBelief ?? 0, 8);
    points += semPts(sq.failedDiscovery ?? 0, 8);
    const changeQ = ((sq.failedBelief ?? 0) + (sq.failedDiscovery ?? 0)) / 2;
    points += semPts(changeQ, 8);
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

  const baseRaw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const baseScore = Math.max(0, Math.min(100, baseRaw));

  // ── P3 blend (IP / Defensibility sub-indicators) ──────────────────────────
  const hasP3Data = !!(data.p3 && (
    data.p3.hasPatent !== undefined || data.p3.technicalDepth ||
    data.p3.knowHowDensity || data.p3.buildComplexity || data.p3.replicationCostUsd !== undefined
  ));

  if (!hasP3Data) {
    return { score: baseScore, rawPoints: Math.max(0, points), maxPoints };
  }

  const p3Result = scoreP3IPDefensibility(data);
  // 55% existing product score + 45% P3 score
  const blended = Math.round(baseScore * 0.55 + p3Result.score * 0.45);
  return { score: Math.max(0, Math.min(100, blended)), rawPoints: Math.max(0, points), maxPoints };
}
