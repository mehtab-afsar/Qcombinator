/**
 * Traction Dimension Scorer
 * Sources: Customer Evidence section + revenue/user data
 * Scoring: Users/customers (40), revenue (30), growth rate (30)
 */

import { AssessmentData } from '../prd-types';

export function calculateTractionScore(data: AssessmentData): {
  score: number;
  rawPoints: number;
  maxPoints: number;
} {
  let points = 0;
  const maxPoints = 100;

  // 1. Users/Customers (40 points)
  const conversationCount = data.conversationCount || 0;
  const hasPayingCustomers = (data.financial?.mrr && data.financial.mrr > 0) ||
                             (data.financial?.arr && data.financial.arr > 0);

  // Customer conversation volume (20 pts)
  if (conversationCount >= 100) {
    points += 20; // Extensive customer discovery
  } else if (conversationCount >= 50) {
    points += 18; // Strong customer discovery
  } else if (conversationCount >= 30) {
    points += 15; // Good customer discovery
  } else if (conversationCount >= 20) {
    points += 12; // Adequate customer discovery
  } else if (conversationCount >= 10) {
    points += 8; // Some customer discovery
  } else if (conversationCount >= 5) {
    points += 4; // Minimal customer discovery
  } else {
    points += 0; // No customer discovery
  }

  // Customer commitment level (20 pts)
  const hasCustomerEvidence = data.customerEvidence && data.customerEvidence.length > 0;
  const evidenceLength = data.customerEvidence?.length || 0;

  // Check for strong commitment signals
  const hasPaidCommitment = data.customerEvidence?.toLowerCase().includes('paid') ||
                           data.customerEvidence?.toLowerCase().includes('purchased') ||
                           data.customerEvidence?.toLowerCase().includes('bought') ||
                           data.customerEvidence?.toLowerCase().includes('$') ||
                           hasPayingCustomers;

  const hasLOI = data.customerEvidence?.toLowerCase().includes('letter of intent') ||
                 data.customerEvidence?.toLowerCase().includes('loi') ||
                 data.customerEvidence?.toLowerCase().includes('signed') ||
                 data.customerEvidence?.toLowerCase().includes('contract');

  const hasWaitlist = data.customerEvidence?.toLowerCase().includes('waitlist') ||
                      data.customerEvidence?.toLowerCase().includes('wait list') ||
                      data.customerEvidence?.toLowerCase().includes('signed up');

  if (hasCustomerEvidence) {
    if (hasPaidCommitment && evidenceLength >= 150) {
      points += 20; // Paying customers with detailed evidence
    } else if (hasPaidCommitment) {
      points += 17; // Paying customers
    } else if (hasLOI && evidenceLength >= 100) {
      points += 15; // LOI/contracts with evidence
    } else if (hasLOI) {
      points += 12; // LOI/contracts
    } else if (hasWaitlist && evidenceLength >= 100) {
      points += 10; // Waitlist with details
    } else if (hasWaitlist) {
      points += 8; // Waitlist mentioned
    } else if (evidenceLength >= 150) {
      points += 6; // Interest but no strong commitment
    } else if (evidenceLength >= 50) {
      points += 3; // Weak evidence
    } else {
      points += 1; // Very weak evidence
    }
  } else {
    points += 0; // No customer evidence
  }

  // 2. Revenue (30 points)
  const mrr = data.financial?.mrr || 0;
  const arr = data.financial?.arr || (mrr * 12);
  const revenue = arr; // Use ARR as primary metric

  if (revenue >= 1_000_000) {
    points += 30; // $1M+ ARR (Series A scale)
  } else if (revenue >= 500_000) {
    points += 28; // $500K+ ARR (strong seed)
  } else if (revenue >= 250_000) {
    points += 25; // $250K+ ARR (growing seed)
  } else if (revenue >= 100_000) {
    points += 22; // $100K+ ARR (early seed)
  } else if (revenue >= 50_000) {
    points += 18; // $50K+ ARR (pre-seed success)
  } else if (revenue >= 25_000) {
    points += 14; // $25K+ ARR (initial traction)
  } else if (revenue >= 10_000) {
    points += 10; // $10K+ ARR (early revenue)
  } else if (revenue >= 5_000) {
    points += 6; // $5K+ ARR (first revenue)
  } else if (revenue > 0) {
    points += 3; // Some revenue
  } else {
    points += 0; // Pre-revenue
  }

  // 3. Growth Rate (30 points)
  const hasGrowthData = data.financial?.growthRate !== undefined ||
                        (data.financial?.previousMrr !== undefined && mrr > 0);

  if (hasGrowthData) {
    let growthRate: number;

    if (data.financial?.growthRate !== undefined) {
      // Direct growth rate provided (percentage)
      growthRate = data.financial.growthRate;
    } else if (data.financial?.previousMrr && mrr > 0) {
      // Calculate from current vs previous MRR
      growthRate = ((mrr - data.financial.previousMrr) / data.financial.previousMrr) * 100;
    } else {
      growthRate = 0;
    }

    // Monthly growth rate scoring
    if (growthRate >= 30) {
      points += 30; // Hypergrowth (30%+ MoM)
    } else if (growthRate >= 20) {
      points += 27; // Exceptional (20-30% MoM)
    } else if (growthRate >= 15) {
      points += 24; // Excellent (15-20% MoM)
    } else if (growthRate >= 10) {
      points += 20; // Great (10-15% MoM)
    } else if (growthRate >= 7) {
      points += 16; // Good (7-10% MoM)
    } else if (growthRate >= 5) {
      points += 12; // Solid (5-7% MoM)
    } else if (growthRate >= 2) {
      points += 8; // Slow growth (2-5% MoM)
    } else if (growthRate > 0) {
      points += 4; // Minimal growth (<2% MoM)
    } else if (growthRate === 0) {
      points += 5; // Flat (better than declining)
    } else {
      points += 2; // Declining (negative growth)
    }
  } else {
    // No growth data, but check for directional indicators
    const recentTraction = conversationCount >= 20 || revenue >= 10_000;

    if (recentTraction) {
      points += 10; // Activity suggests growth but no metrics
    } else {
      points += 5; // No growth data available
    }
  }

  // Normalize to 0-100 scale
  const score = Math.min(Math.round((points / maxPoints) * 100), 100);

  return {
    score,
    rawPoints: points,
    maxPoints
  };
}
