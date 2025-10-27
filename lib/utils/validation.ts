/**
 * Validation Utilities
 * For validating user inputs in founder assessment
 */

/**
 * Check if date is within specified range (in days)
 */
export const isDateWithinRange = (date: Date, maxDaysAgo: number): boolean => {
  const now = new Date();
  const daysDifference = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return daysDifference >= 0 && daysDifference <= maxDaysAgo;
};

/**
 * Calculate days since a given date
 */
export const daysSince = (date: Date): number => {
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Validate LinkedIn URL format
 */
export const isValidLinkedInUrl = (url: string): boolean => {
  if (!url) return false;
  const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
  return linkedInPattern.test(url);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * Check if a number is within a reasonable range
 */
export const isReasonableNumber = (
  value: number,
  min: number,
  max: number
): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate URL format (general)
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if conversion rate is realistic (for market sizing)
 */
export const isRealisticConversionRate = (rate: number): boolean => {
  // Conversion rates above 30% are highly unusual
  return rate >= 0.1 && rate <= 30;
};

/**
 * Check if daily activity is realistic (e.g., sales calls per day)
 */
export const isRealisticDailyActivity = (
  totalActivities: number,
  durationMonths: number
): boolean => {
  const workDaysPerMonth = 20; // Approximately
  const totalWorkDays = durationMonths * workDaysPerMonth;
  const dailyAverage = totalActivities / totalWorkDays;

  // More than 10 activities per day is typically unrealistic
  return dailyAverage <= 10;
};

/**
 * Validate equity split adds up to ~100%
 */
export const isValidEquitySplit = (splits: number[]): boolean => {
  const total = splits.reduce((sum, split) => sum + split, 0);
  // Allow 95-105% for rounding
  return total >= 95 && total <= 105;
};

/**
 * Check if a date is not in the future
 */
export const isNotFutureDate = (date: Date): boolean => {
  return date <= new Date();
};

/**
 * Validate that minimum word count is met
 */
export const meetsMinWordCount = (text: string, minWords: number): {
  isValid: boolean;
  currentCount: number;
  message: string;
} => {
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isValid = wordCount >= minWords;

  return {
    isValid,
    currentCount: wordCount,
    message: isValid
      ? `Great! ${wordCount} words provided.`
      : `Please add ${minWords - wordCount} more words (${wordCount}/${minWords})`,
  };
};

/**
 * Check if financial metrics make sense together
 */
export const areFinancialMetricsConsistent = (
  cac: number,
  ltv: number,
  churnRate: number,
  avgContractValue: number
): { isConsistent: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  // LTV:CAC ratio should be > 1
  if (ltv <= cac) {
    warnings.push('LTV should be higher than CAC for a sustainable business');
  }

  // Very high churn rates are problematic
  if (churnRate > 10) {
    warnings.push('Monthly churn rate above 10% is very high');
  }

  // LTV calculation check (simplified)
  const impliedLTV = avgContractValue / (churnRate / 100 || 1);
  if (Math.abs(impliedLTV - ltv) > ltv * 0.5) {
    warnings.push('LTV doesn\'t match contract value and churn rate');
  }

  return {
    isConsistent: warnings.length === 0,
    warnings,
  };
};
