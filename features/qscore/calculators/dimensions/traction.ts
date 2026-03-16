/**
 * Traction Dimension Scorer
 * Sources: Customer Evidence + revenue data
 *
 * Numeric thresholds (conversation count, ARR tiers) are DB-driven.
 * Text-based commitment scoring uses keyword detection (not DB-driven).
 */

import { AssessmentData } from '../../types/qscore.types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';

export function calculateTractionScore(
  data: AssessmentData,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  let points = 0;
  const maxPoints = 100;
  const t = thresholds ?? new Map();

  // 1. Customer Conversations (20 pts)
  const conversationCount = data.conversationCount || 0;
  const ccTiers = getTiers(t, 'traction', 'conversation_count');
  if (ccTiers) {
    points += scoreTiers(conversationCount, ccTiers);
  } else {
    if (conversationCount >= 100) points += 20;
    else if (conversationCount >= 50) points += 18;
    else if (conversationCount >= 30) points += 15;
    else if (conversationCount >= 20) points += 12;
    else if (conversationCount >= 10) points += 8;
    else if (conversationCount >= 5) points += 4;
    else points += 0;
  }

  // 2. Customer Commitment Level (20 pts) — keyword-based, not DB-driven
  const commitmentText = data.customerCommitment || '';
  const hasPayingCustomers = (data.financial?.mrr && data.financial.mrr > 0) ||
                             (data.financial?.arr && data.financial.arr > 0);

  if (commitmentText.length > 0) {
    const hasPaid = commitmentText.toLowerCase().includes('paid') ||
                    commitmentText.toLowerCase().includes('purchased') ||
                    commitmentText.toLowerCase().includes('bought') ||
                    commitmentText.toLowerCase().includes('$') ||
                    hasPayingCustomers;
    const hasLOI = commitmentText.toLowerCase().includes('letter of intent') ||
                   commitmentText.toLowerCase().includes('loi') ||
                   commitmentText.toLowerCase().includes('signed') ||
                   commitmentText.toLowerCase().includes('contract');
    const hasWaitlist = commitmentText.toLowerCase().includes('waitlist') ||
                        commitmentText.toLowerCase().includes('wait list') ||
                        commitmentText.toLowerCase().includes('signed up');
    const len = commitmentText.length;

    if (hasPaid && len >= 150) points += 20;
    else if (hasPaid) points += 17;
    else if (hasLOI && len >= 100) points += 15;
    else if (hasLOI) points += 12;
    else if (hasWaitlist && len >= 100) points += 10;
    else if (hasWaitlist) points += 8;
    else if (len >= 150) points += 6;
    else if (len >= 50) points += 3;
    else points += 1;
  }

  // 3. Revenue (30 pts)
  const mrr = data.financial?.mrr || 0;
  const arr = data.financial?.arr || (mrr * 12);
  const arrTiers = getTiers(t, 'traction', 'arr');
  if (arrTiers) {
    points += scoreTiers(arr, arrTiers);
  } else {
    if (arr >= 1_000_000) points += 30;
    else if (arr >= 500_000) points += 28;
    else if (arr >= 250_000) points += 25;
    else if (arr >= 100_000) points += 22;
    else if (arr >= 50_000) points += 18;
    else if (arr >= 25_000) points += 14;
    else if (arr >= 10_000) points += 10;
    else if (arr >= 5_000) points += 6;
    else if (arr > 0) points += 3;
    else points += 0;
  }

  // 4. Growth proxy (10 pts) — structural, not DB-driven
  const recentTraction = conversationCount >= 20 || arr >= 10_000;
  if (recentTraction) points += 10;
  else points += 5;

  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  return { score: Math.max(0, Math.min(100, raw)), rawPoints: Math.max(0, points), maxPoints };
}
