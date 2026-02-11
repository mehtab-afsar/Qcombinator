/**
 * Market Realism Scoring
 * Max: 150 points (15% of total founder score)
 */


/**
 * Score: Bottom-Up Market Sizing
 * Max: 150 points
 */
export const scoreMarketRealism = (data: {
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  validationChecks: string[]; // Array of checkbox values
}): number => {
  let score = 0;

  // Realistic conversation volume (0-50 points)
  const monthsDuration = 18;
  const workDaysPerMonth = 20;
  const totalWorkDays = monthsDuration * workDaysPerMonth;
  const dailyConversations = data.talkToCount / totalWorkDays;

  if (dailyConversations <= 2) score += 50; // Very realistic
  else if (dailyConversations <= 3) score += 42; // Realistic
  else if (dailyConversations <= 5) score += 32; // Aggressive but possible
  else if (dailyConversations <= 8) score += 18; // Optimistic
  else if (dailyConversations <= 10) score += 8; // Unrealistic
  else score += 2; // Fantasy land

  // Realistic conversion rate (0-40 points)
  if (data.conversionRate >= 2 && data.conversionRate <= 8) {
    score += 40; // Realistic range for B2B
  } else if (data.conversionRate >= 1 && data.conversionRate < 2) {
    score += 30; // Conservative (might be too low)
  } else if (data.conversionRate >= 8 && data.conversionRate <= 15) {
    score += 28; // Optimistic but achievable
  } else if (data.conversionRate > 15 && data.conversionRate <= 25) {
    score += 15; // Very optimistic
  } else if (data.conversionRate < 1) {
    score += 10; // Too conservative
  } else {
    score += 5; // Fantasy (>25%)
  }

  // Revenue potential (0-30 points)
  const projectedRevenue =
    data.talkToCount * (data.conversionRate / 100) * data.avgContractValue;

  if (projectedRevenue >= 500000) score += 30; // $500K+ (attractive)
  else if (projectedRevenue >= 300000) score += 26; // $300K+ (solid)
  else if (projectedRevenue >= 150000) score += 22; // $150K+ (okay)
  else if (projectedRevenue >= 75000) score += 14; // $75K+ (weak)
  else if (projectedRevenue >= 25000) score += 6; // $25K+ (too small)
  else score += 2; // Below $25K

  // Validation checks completed (0-30 points)
  score += data.validationChecks.length * 10; // 10 points per check (max 3)

  return Math.min(score, 150);
};

/**
 * Calculate detailed market metrics
 */
export const calculateMarketMetrics = (data: {
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  customerLifetimeMonths: number;
}): {
  projectedRevenue: number;
  revenuePerConversation: number;
  customerCount: number;
  ltvCacRatio: number;
  dailyConversations: number;
  warnings: string[];
} => {
  const customerCount = data.talkToCount * (data.conversionRate / 100);
  const projectedRevenue = customerCount * data.avgContractValue;
  const revenuePerConversation = projectedRevenue / data.talkToCount;

  // Assume $500 CAC (industry average for B2B SaaS)
  const assumedCAC = 500;
  const ltv = data.avgContractValue * data.customerLifetimeMonths;
  const ltvCacRatio = ltv / assumedCAC;

  const dailyConversations = data.talkToCount / (18 * 20); // 18 months, 20 work days

  const warnings: string[] = [];

  // Generate warnings
  if (dailyConversations > 5) {
    warnings.push(`You're planning ${dailyConversations.toFixed(1)} conversations/day. Is this realistic?`);
  }

  if (data.conversionRate > 15) {
    warnings.push(`${data.conversionRate}% conversion rate is very high for cold outreach`);
  }

  if (ltvCacRatio < 3) {
    warnings.push('LTV:CAC ratio below 3:1 suggests unit economics may not work');
  }

  if (projectedRevenue < 100000) {
    warnings.push('$100K in 18 months may be too small to attract investors');
  }

  if (data.talkToCount < 50) {
    warnings.push('Consider increasing your outreach target - 50+ conversations shows commitment');
  }

  return {
    projectedRevenue,
    revenuePerConversation,
    customerCount,
    ltvCacRatio,
    dailyConversations,
    warnings,
  };
};

/**
 * Calculate total Market Realism score with detailed breakdown
 */
export const calculateMarketRealismScore = (data: {
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  customerLifetimeMonths: number;
  validationChecks: string[];
}): {
  total: number;
  metrics: ReturnType<typeof calculateMarketMetrics>;
  feedback: string[];
  grade: string;
} => {
  const total = scoreMarketRealism(data);
  const metrics = calculateMarketMetrics(data);

  const feedback: string[] = [];

  if (total >= 120) {
    feedback.push('Excellent market sizing - your assumptions are realistic and well-thought-out');
  }

  if (metrics.projectedRevenue >= 500000) {
    feedback.push('Strong revenue target that will attract investor interest');
  }

  if (metrics.ltvCacRatio >= 3) {
    feedback.push('Good LTV:CAC ratio suggests healthy unit economics');
  }

  // Add warnings as feedback
  feedback.push(...metrics.warnings);

  let grade = 'F';
  if (total >= 135) grade = 'A';
  else if (total >= 120) grade = 'B';
  else if (total >= 105) grade = 'C';
  else if (total >= 90) grade = 'D';

  return {
    total,
    metrics,
    feedback,
    grade,
  };
};
