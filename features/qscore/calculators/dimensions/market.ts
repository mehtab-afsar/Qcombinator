/**
 * Market Dimension Scorer
 * Sources: Market Realism section (TAM, conversion, activity)
 *
 * Thresholds are DB-driven via ThresholdMap. Falls back to hardcoded values
 * if thresholds are not loaded (e.g. during tests or DB unavailability).
 */

import { AssessmentData } from '../../types/qscore.types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';
import { scoreP2MarketPotential } from '../parameters/p2-market-potential';

export function calculateMarketScore(
  data: AssessmentData,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  const targetCustomers = data.targetCustomers ?? 0;
  const lifetimeValue = data.lifetimeValue ?? 0;
  const conversionRate = data.conversionRate ?? 0;
  const dailyActivity = data.dailyActivity ?? 0;
  const costPerAcquisition = data.costPerAcquisition ?? 0;

  if (targetCustomers === 0 && lifetimeValue === 0 && conversionRate === 0 && costPerAcquisition === 0) {
    return { score: 0, rawPoints: 0, maxPoints: 100 };
  }

  let points = 0;
  const maxPoints = 100;

  // 1. TAM Size (40 pts)
  const tam = targetCustomers * lifetimeValue;
  const tamTiers = getTiers(thresholds ?? new Map(), 'market', 'tam');
  if (tamTiers) {
    points += scoreTiers(tam, tamTiers);
  } else {
    if (tam >= 1_000_000_000) points += 40;
    else if (tam >= 100_000_000) points += 35;
    else if (tam >= 10_000_000) points += 28;
    else if (tam >= 1_000_000) points += 20;
    else points += 10;
  }

  // 2. Conversion Rate Realism (30 pts)
  const crTiers = getTiers(thresholds ?? new Map(), 'market', 'conversion_rate');
  if (crTiers) {
    points += scoreTiers(conversionRate, crTiers);
  } else {
    if (conversionRate >= 0.5 && conversionRate <= 5) points += 30;
    else if (conversionRate >= 0.1 && conversionRate <= 10) points += 20;
    else if (conversionRate < 0.5) points += 10;
    else points += 5;
  }

  // 3. Daily Activity Assumptions (20 pts)
  const activityRate = targetCustomers > 0 ? (dailyActivity / targetCustomers) * 100 : 0;
  const arTiers = getTiers(thresholds ?? new Map(), 'market', 'activity_rate');
  if (arTiers) {
    points += scoreTiers(activityRate, arTiers);
  } else {
    if (activityRate >= 10 && activityRate <= 50) points += 20;
    else if (activityRate >= 5 && activityRate <= 70) points += 15;
    else points += 5;
  }

  // 4. LTV:CAC Unit Economics (10 pts)
  const ltvCacRatio = costPerAcquisition > 0 ? lifetimeValue / costPerAcquisition : 0;
  const ltvTiers = getTiers(thresholds ?? new Map(), 'market', 'ltv_cac_ratio');
  if (ltvTiers) {
    points += scoreTiers(ltvCacRatio, ltvTiers);
  } else {
    if (ltvCacRatio >= 3) points += 10;
    else if (ltvCacRatio >= 2) points += 7;
    else if (ltvCacRatio >= 1) points += 4;
    else points += 0;
  }

  const baseRaw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  const baseScore = Math.max(0, Math.min(100, baseRaw));

  // ── P2 blend (Market Potential sub-indicators) ────────────────────────────
  // Only blend when P2 data is present; otherwise keep base score untouched.
  const hasP2Data = !!(data.p2 && (
    data.p2.tamDescription || data.p2.marketUrgency || data.p2.valuePool ||
    data.p2.expansionPotential || data.p2.competitorCount !== undefined
  ));

  if (!hasP2Data) {
    return { score: baseScore, rawPoints: Math.max(0, points), maxPoints };
  }

  const p2Result = scoreP2MarketPotential(data);
  // 55% existing market score + 45% P2 score
  const blended = Math.round(baseScore * 0.55 + p2Result.score * 0.45);
  return { score: Math.max(0, Math.min(100, blended)), rawPoints: Math.max(0, points), maxPoints };
}
