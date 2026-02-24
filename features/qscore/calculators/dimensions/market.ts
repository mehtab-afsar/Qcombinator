/**
 * Market Dimension Scorer
 * Sources: Market Realism section (TAM, conversion, activity)
 * Scoring: 0-100 based on market size, growth potential, and realism
 */

import { AssessmentData } from '../../types/qscore.types';

export function calculateMarketScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  const targetCustomers = data.targetCustomers ?? 0;
  const lifetimeValue = data.lifetimeValue ?? 0;
  const conversionRate = data.conversionRate ?? 0;
  const dailyActivity = data.dailyActivity ?? 0;
  const costPerAcquisition = data.costPerAcquisition ?? 0;

  // If no market data at all, return 0 (confidence layer handles display)
  if (targetCustomers === 0 && lifetimeValue === 0 && conversionRate === 0 && costPerAcquisition === 0) {
    return { score: 0, rawPoints: 0, maxPoints: 100 };
  }

  let points = 0;
  const maxPoints = 100;

  // 1. TAM Size (40 points)
  const tam = targetCustomers * lifetimeValue;
  if (tam >= 1_000_000_000) points += 40; // $1B+ TAM
  else if (tam >= 100_000_000) points += 35; // $100M+ TAM
  else if (tam >= 10_000_000) points += 28; // $10M+ TAM
  else if (tam >= 1_000_000) points += 20; // $1M+ TAM
  else points += 10; // < $1M TAM

  // 2. Conversion Rate Realism (30 points)
  if (conversionRate >= 0.5 && conversionRate <= 5) {
    points += 30; // Realistic range (0.5% - 5%)
  } else if (conversionRate >= 0.1 && conversionRate <= 10) {
    points += 20; // Somewhat realistic
  } else if (conversionRate < 0.5) {
    points += 10; // Too conservative
  } else {
    points += 5; // Unrealistic (>10%)
  }

  // 3. Daily Activity Assumptions (20 points)
  const activityRate = targetCustomers > 0 ? (dailyActivity / targetCustomers) * 100 : 0;

  if (activityRate >= 10 && activityRate <= 50) {
    points += 20; // Realistic engagement
  } else if (activityRate >= 5 && activityRate <= 70) {
    points += 15; // Somewhat realistic
  } else {
    points += 5; // Unrealistic assumptions
  }

  // 4. Unit Economics Validation (10 points)
  const ltvCacRatio = costPerAcquisition > 0 ? lifetimeValue / costPerAcquisition : 0;

  if (ltvCacRatio >= 3) points += 10; // Excellent (3:1 or better)
  else if (ltvCacRatio >= 2) points += 7; // Good (2:1)
  else if (ltvCacRatio >= 1) points += 4; // Breakeven
  else points += 0; // Negative economics

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
