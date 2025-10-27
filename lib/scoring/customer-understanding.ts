/**
 * Customer Understanding Scoring
 * Max: 300 points (30% of total founder score)
 */

import {
  getWordCount,
  hasLearningIndicators,
  hasValidationIndicators,
  countWords,
} from '@/lib/utils/text-analysis';
import { daysSince } from '@/lib/utils/validation';

/**
 * Score: Customer Evidence
 * Max: 200 points
 */
export const scoreCustomerEvidence = (data: {
  customerType: string;
  conversationDate: Date;
  quote: string;
  surprise: string;
  commitment: string;
  conversationCount: number;
  customerList?: string[];
}): number => {
  let score = 0;

  // Recency (0-25 points)
  const daysAgo = daysSince(data.conversationDate);
  if (daysAgo <= 30) score += 25; // Within 1 month
  else if (daysAgo <= 90) score += 18; // Within 3 months
  else if (daysAgo <= 180) score += 10; // Within 6 months
  else score += 3; // Older than 6 months

  // Quote quality (0-40 points)
  const quoteWords = getWordCount(data.quote);
  if (quoteWords >= 50) {
    score += 25; // Detailed quote

    // Pain intensity indicators
    const painWords = [
      'nightmare', 'terrible', 'hate', 'frustrated', 'expensive',
      'waste', 'insane', 'killing us', 'painful', 'annoying', 'struggle'
    ];
    const hasPain = painWords.some(w =>
      data.quote.toLowerCase().includes(w)
    );
    if (hasPain) score += 15; // Strong pain signal
  } else if (quoteWords >= 30) {
    score += 15;
  } else if (quoteWords >= 15) {
    score += 8;
  }

  // Learning/surprise depth (0-35 points)
  const surpriseWords = getWordCount(data.surprise);
  if (surpriseWords >= 50) {
    score += 22;

    // Evidence of insight change
    if (hasLearningIndicators(data.surprise)) {
      score += 13; // Shows adaptability
    }
  } else if (surpriseWords >= 25) {
    score += 15;
  } else if (surpriseWords >= 10) {
    score += 8;
  }

  // Commitment strength (0-60 points)
  const commitmentLower = data.commitment.toLowerCase();
  if (commitmentLower.includes('signed') ||
      commitmentLower.includes('loi') ||
      commitmentLower.includes('contract') ||
      commitmentLower.includes('paid')) {
    score += 60; // Strongest signal
  } else if (commitmentLower.includes('will pay') ||
             commitmentLower.includes('switch') ||
             commitmentLower.includes('commit')) {
    score += 35; // Strong intent
  } else if (commitmentLower.includes('interested') ||
             commitmentLower.includes('would consider') ||
             commitmentLower.includes('maybe')) {
    score += 15; // Weak signal
  } else {
    score += 5; // No commitment mentioned
  }

  // Conversation volume (0-30 points)
  if (data.conversationCount >= 50) score += 30;
  else if (data.conversationCount >= 30) score += 25;
  else if (data.conversationCount >= 20) score += 20;
  else if (data.conversationCount >= 10) score += 15;
  else if (data.conversationCount >= 5) score += 10;
  else if (data.conversationCount >= 1) score += 5;

  // Named customer list credibility (bonus 0-10 points)
  if (data.customerList && data.customerList.length >= 3) {
    score += 10; // Verifiable claims
  } else if (data.customerList && data.customerList.length >= 1) {
    score += 5;
  }

  return Math.min(score, 200);
};

/**
 * Score: Failed Assumptions (Learning Velocity)
 * Max: 100 points
 */
export const scoreFailedAssumptions = (data: {
  belief: string;
  reasoning: string;
  discovery: string;
  change: string;
}): number => {
  let score = 0;

  // Willingness to admit being wrong (0-25 points)
  const beliefWords = getWordCount(data.belief);
  if (beliefWords >= 30) score += 25;
  else if (beliefWords >= 20) score += 18;
  else if (beliefWords >= 10) score += 12;
  else if (beliefWords >= 5) score += 6;

  // Discovery specificity (0-30 points)
  const discoveryWords = getWordCount(data.discovery);
  const hasQuote = data.discovery.includes('"') || data.discovery.includes("'");

  if (discoveryWords >= 40 && hasQuote) score += 30;
  else if (discoveryWords >= 30) score += 22;
  else if (discoveryWords >= 20) score += 15;
  else if (discoveryWords >= 10) score += 8;

  // Action taken (0-30 points)
  const actionWords = [
    'changed', 'pivoted', 'adjusted', 'rebuilt', 'added',
    'removed', 'switched', 'now', 'instead', 'modified'
  ];
  const hasAction = actionWords.some(w =>
    data.change.toLowerCase().includes(w)
  );

  if (hasAction) {
    score += 18;

    // Quantified improvement
    const hasImpactNumbers = /\d+%|\dx|doubled|tripled|increased|decreased/i.test(data.change);
    if (hasImpactNumbers) {
      score += 12; // Measured impact
    }
  } else {
    score += 5; // Some change mentioned
  }

  // Reasoning depth (0-15 points)
  const reasoningWords = getWordCount(data.reasoning);
  if (reasoningWords >= 30) score += 15;
  else if (reasoningWords >= 20) score += 10;
  else if (reasoningWords >= 10) score += 5;

  return Math.min(score, 100);
};

/**
 * Calculate total Customer Understanding score
 * Max: 300 points
 */
export const calculateCustomerUnderstandingScore = (data: {
  customerEvidence: {
    customerType: string;
    conversationDate: Date;
    quote: string;
    surprise: string;
    commitment: string;
    conversationCount: number;
    customerList?: string[];
  };
  failedAssumptions: {
    belief: string;
    reasoning: string;
    discovery: string;
    change: string;
  };
}): {
  total: number;
  breakdown: {
    customerEvidence: number;
    failedAssumptions: number;
  };
  feedback: string[];
  grade: string;
} => {
  const evidenceScore = scoreCustomerEvidence(data.customerEvidence);
  const assumptionsScore = scoreFailedAssumptions(data.failedAssumptions);

  const total = evidenceScore + assumptionsScore;

  // Generate feedback
  const feedback: string[] = [];

  // Customer Evidence feedback
  if (data.customerEvidence.conversationCount < 10) {
    feedback.push('Talk to more customers - successful founders have 50+ conversations before launch');
  }
  if (evidenceScore >= 160) {
    feedback.push('Outstanding customer discovery - you have strong validation');
  }
  if (data.customerEvidence.quote.length < 100) {
    feedback.push('Get more detailed quotes from customers to understand their pain deeply');
  }

  // Failed Assumptions feedback
  if (assumptionsScore < 50) {
    feedback.push('Show more evidence of learning and adaptation based on customer feedback');
  }
  if (assumptionsScore >= 80) {
    feedback.push('Excellent learning velocity - you adapt quickly based on data');
  }

  // Grade calculation
  let grade = 'F';
  if (total >= 270) grade = 'A';
  else if (total >= 240) grade = 'B';
  else if (total >= 210) grade = 'C';
  else if (total >= 180) grade = 'D';

  return {
    total,
    breakdown: {
      customerEvidence: evidenceScore,
      failedAssumptions: assumptionsScore,
    },
    feedback,
    grade,
  };
};
