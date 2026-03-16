/**
 * Financial Dimension Scorer
 * Sources: Financial section (MRR/ARR, gross margin, runway, projections)
 *
 * Thresholds are DB-driven via ThresholdMap. Falls back to hardcoded values
 * if thresholds are not loaded.
 */

import { AssessmentData } from '../../types/qscore.types';
import { ThresholdMap, scoreTiers, getTiers } from '../../services/threshold-config';

export function calculateFinancialScore(
  data: AssessmentData,
  thresholds?: ThresholdMap
): { score: number; rawPoints: number; maxPoints: number } {
  let points = 0;
  const maxPoints = 100;

  if (!data.financial) {
    return { score: 50, rawPoints: 50, maxPoints: 100 };
  }

  const finData = data.financial;
  const t = thresholds ?? new Map();

  // 1. Gross Margin (20 pts)
  const hasCOGS = finData.cogs !== undefined && finData.cogs >= 0;
  const hasAvgDeal = finData.averageDealSize !== undefined && finData.averageDealSize > 0;

  if (hasCOGS && hasAvgDeal && finData.averageDealSize! > 0) {
    const grossMargin = isFinite(finData.cogs! / finData.averageDealSize!)
      ? ((finData.averageDealSize! - finData.cogs!) / finData.averageDealSize!) * 100
      : 0;
    const gmTiers = getTiers(t, 'financial', 'gross_margin_pct');
    if (gmTiers) {
      points += scoreTiers(grossMargin, gmTiers);
    } else {
      if (grossMargin >= 80) points += 20;
      else if (grossMargin >= 70) points += 17;
      else if (grossMargin >= 60) points += 14;
      else if (grossMargin >= 50) points += 10;
      else if (grossMargin >= 40) points += 6;
      else points += 2;
    }
  } else {
    points += 5;
  }

  // 2. ARR / Revenue Scale (20 pts)
  const revenue = finData.arr || (finData.mrr || 0) * 12;
  const arrTiers = getTiers(t, 'financial', 'arr');
  if (arrTiers) {
    points += scoreTiers(revenue, arrTiers);
  } else {
    if (revenue >= 1_000_000) points += 20;
    else if (revenue >= 500_000) points += 17;
    else if (revenue >= 100_000) points += 14;
    else if (revenue >= 50_000) points += 10;
    else if (revenue >= 10_000) points += 6;
    else if (revenue > 0) points += 3;
    else points += 0;
  }

  // 3. Runway & Cash Management (30 pts)
  const hasRunway = finData.runway !== undefined && finData.runway > 0;
  const hasBurn = finData.monthlyBurn > 0;

  if (hasRunway) {
    const runwayTiers = getTiers(t, 'financial', 'runway_months');
    if (runwayTiers) {
      points += scoreTiers(finData.runway!, runwayTiers);
    } else {
      const runway = finData.runway!;
      if (runway >= 18) points += 30;
      else if (runway >= 12) points += 25;
      else if (runway >= 9) points += 20;
      else if (runway >= 6) points += 15;
      else if (runway >= 3) points += 10;
      else points += 5;
    }
  } else if (hasBurn) {
    points += 10;
  } else {
    points += 5;
  }

  // 4. Financial Projections (30 pts)
  const hasProjections = finData.projectedRevenue12mo !== undefined && finData.projectedRevenue12mo > 0;
  const hasAssumptions = finData.revenueAssumptions && finData.revenueAssumptions.length > 50;

  // Projection quality (15 pts)
  if (hasProjections && revenue > 0) {
    const projectedGrowth = ((finData.projectedRevenue12mo! - revenue) / revenue) * 100;
    const pgTiers = getTiers(t, 'financial', 'projected_growth_pct');
    if (pgTiers) {
      points += scoreTiers(projectedGrowth, pgTiers);
    } else {
      if (projectedGrowth >= 50 && projectedGrowth <= 300) points += 15;
      else if (projectedGrowth >= 20 && projectedGrowth <= 500) points += 12;
      else if (projectedGrowth >= 0) points += 8;
      else points += 3;
    }
  } else if (hasProjections) {
    points += 10;
  } else {
    points += 3;
  }

  // Assumptions documentation (15 pts) — text-based, not DB-driven
  if (hasAssumptions) {
    const len = finData.revenueAssumptions!.length;
    if (len >= 200) points += 15;
    else if (len >= 100) points += 12;
    else points += 8;
  } else {
    points += 3;
  }

  const raw = isFinite(points) ? Math.round((points / maxPoints) * 100) : 0;
  return { score: Math.max(0, Math.min(100, raw)), rawPoints: Math.max(0, points), maxPoints };
}
