/**
 * Product Dimension Scorer
 * Sources: Customer Evidence + Learning Velocity + Failed Assumptions sections
 * Scoring: Customer validation (40), iteration speed (30), product learning (30)
 */

import { AssessmentData } from '../../types/qscore.types';

export function calculateProductScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // 1. Customer Validation Quality (40 points)
  // Based on customer conversation depth and evidence
  const hasCustomerEvidence = data.customerQuote && data.customerQuote.length > 50;
  const hasSpecificCommitment = data.customerCommitment && data.customerCommitment.length > 30;
  const hasSurprises = data.customerSurprise && data.customerSurprise.length > 30;
  const conversationCount = data.conversationCount || 0;

  // Conversation count scoring (20 pts)
  if (conversationCount >= 50) points += 20;
  else if (conversationCount >= 20) points += 16;
  else if (conversationCount >= 10) points += 12;
  else if (conversationCount >= 5) points += 8;
  else points += 4;

  // Evidence quality scoring (20 pts)
  if (hasCustomerEvidence) points += 8;
  if (hasSpecificCommitment) points += 7;
  if (hasSurprises) points += 5;

  // 2. Learning Velocity & Iteration (30 points)
  // Based on how fast they build, test, and learn
  const buildTime = data.buildTime || 0;
  const hasTestedHypothesis = data.tested && data.tested.length > 50;
  const hasMeasurement = data.measurement && data.measurement.length > 30;
  const hasLearned = data.learned && data.learned.length > 50;
  const hasChanged = data.changed && data.changed.length > 30;

  // Build time scoring (10 pts) - faster is better
  if (buildTime <= 7) points += 10; // 1 week or less
  else if (buildTime <= 14) points += 8; // 2 weeks
  else if (buildTime <= 30) points += 6; // 1 month
  else if (buildTime <= 60) points += 4; // 2 months
  else points += 2; // > 2 months

  // Learning completeness (20 pts)
  if (hasTestedHypothesis) points += 5;
  if (hasMeasurement) points += 5;
  if (hasLearned) points += 5;
  if (hasChanged) points += 5;

  // 3. Failed Assumptions & Learning (30 points)
  // Shows intellectual honesty and ability to pivot
  const hasFailedAssumption = data.failedBelief && data.failedBelief.length > 30;
  const hasDiscovery = data.failedDiscovery && data.failedDiscovery.length > 50;
  const hasChangeResponse = data.failedChange && data.failedChange.length > 50;
  const hasReasoning = data.failedReasoning && data.failedReasoning.length > 30;

  if (hasFailedAssumption) points += 8;
  if (hasDiscovery) points += 8;
  if (hasChangeResponse) points += 8;
  if (hasReasoning) points += 6;

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
