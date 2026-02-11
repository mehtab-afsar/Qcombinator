/**
 * Financial Dimension Scorer
 * Sources: NEW Financial section (to be added to assessment)
 * Scoring: Unit economics (40), runway (30), projections (30)
 */

import { AssessmentData } from '../prd-types';

export function calculateFinancialScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // If no financial data provided, return default score
  if (!data.financial) {
    return {
      score: 50, // Default middle score if section not completed
      rawPoints: 50,
      maxPoints: 100
    };
  }

  const finData = data.financial;

  // 1. Unit Economics (40 points)
  const hasCOGS = finData.cogs !== undefined && finData.cogs >= 0;
  const hasAvgDeal = finData.averageDealSize !== undefined && finData.averageDealSize > 0;
  const _hasRevenue = (finData.mrr && finData.mrr > 0) || (finData.arr && finData.arr > 0);

  // Gross margin calculation (20 pts)
  if (hasCOGS && hasAvgDeal && finData.averageDealSize! > 0) {
    const grossMargin = ((finData.averageDealSize! - finData.cogs!) / finData.averageDealSize!) * 100;
    if (grossMargin >= 80) points += 20; // Excellent (80%+)
    else if (grossMargin >= 70) points += 17; // Great (70-80%)
    else if (grossMargin >= 60) points += 14; // Good (60-70%)
    else if (grossMargin >= 50) points += 10; // Acceptable (50-60%)
    else if (grossMargin >= 40) points += 6; // Low (40-50%)
    else points += 2; // Poor (<40%)
  } else {
    points += 5; // No unit economics tracked
  }

  // Revenue existence and scale (20 pts)
  const revenue = finData.arr || (finData.mrr || 0) * 12;
  if (revenue >= 1_000_000) points += 20; // $1M+ ARR
  else if (revenue >= 500_000) points += 17; // $500K+ ARR
  else if (revenue >= 100_000) points += 14; // $100K+ ARR
  else if (revenue >= 50_000) points += 10; // $50K+ ARR
  else if (revenue >= 10_000) points += 6; // $10K+ ARR
  else if (revenue > 0) points += 3; // Some revenue
  else points += 0; // No revenue yet

  // 2. Runway & Cash Management (30 points)
  const hasRunway = finData.runway !== undefined && finData.runway > 0;
  const hasBurn = finData.monthlyBurn > 0;

  if (hasRunway) {
    const runway = finData.runway!;
    if (runway >= 18) points += 30; // 18+ months
    else if (runway >= 12) points += 25; // 12-18 months
    else if (runway >= 9) points += 20; // 9-12 months
    else if (runway >= 6) points += 15; // 6-9 months
    else if (runway >= 3) points += 10; // 3-6 months
    else points += 5; // < 3 months (critical)
  } else if (hasBurn) {
    // Has burn but no runway specified
    points += 10; // Partial credit for tracking burn
  } else {
    // No financial tracking
    points += 5;
  }

  // 3. Financial Projections (30 points)
  const hasProjections = finData.projectedRevenue12mo !== undefined && finData.projectedRevenue12mo > 0;
  const hasAssumptions = finData.revenueAssumptions && finData.revenueAssumptions.length > 50;

  // Projection quality (15 pts)
  if (hasProjections && revenue > 0) {
    const projectedGrowth = ((finData.projectedRevenue12mo! - revenue) / revenue) * 100;
    // Realistic growth rates
    if (projectedGrowth >= 50 && projectedGrowth <= 300) {
      points += 15; // Realistic ambitious growth
    } else if (projectedGrowth >= 20 && projectedGrowth <= 500) {
      points += 12; // Plausible range
    } else if (projectedGrowth >= 0) {
      points += 8; // Conservative or very aggressive
    } else {
      points += 3; // Declining projections
    }
  } else if (hasProjections) {
    points += 10; // Has projections, no baseline
  } else {
    points += 3; // No projections
  }

  // Assumptions documentation (15 pts)
  if (hasAssumptions) {
    const assumptionsLength = finData.revenueAssumptions!.length;
    if (assumptionsLength >= 200) points += 15; // Detailed
    else if (assumptionsLength >= 100) points += 12; // Moderate
    else points += 8; // Basic
  } else {
    points += 3; // No assumptions
  }

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
