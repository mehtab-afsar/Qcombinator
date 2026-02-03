/**
 * Market Dimension Scorer
 * Sources: Market Realism section (TAM, conversion, activity)
 * Scoring: 0-100 based on market size, growth potential, and realism
 */

import { AssessmentData } from '../prd-types';

export function calculateMarketScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // 1. TAM Size (40 points)
  const tam = data.targetCustomers * data.lifetimeValue;
  if (tam >= 1_000_000_000) points += 40; // $1B+ TAM
  else if (tam >= 100_000_000) points += 35; // $100M+ TAM
  else if (tam >= 10_000_000) points += 28; // $10M+ TAM
  else if (tam >= 1_000_000) points += 20; // $1M+ TAM
  else points += 10; // < $1M TAM

  // 2. Conversion Rate Realism (30 points)
  const conversionRate = data.conversionRate;
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
  const dailyActivity = data.dailyActivity;
  const targetCustomers = data.targetCustomers;
  const activityRate = (dailyActivity / targetCustomers) * 100;

  if (activityRate >= 10 && activityRate <= 50) {
    points += 20; // Realistic engagement
  } else if (activityRate >= 5 && activityRate <= 70) {
    points += 15; // Somewhat realistic
  } else {
    points += 5; // Unrealistic assumptions
  }

  // 4. Unit Economics Validation (10 points)
  const ltv = data.lifetimeValue;
  const cac = data.costPerAcquisition;
  const ltvCacRatio = ltv / cac;

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
