/**
 * Founder-Problem Fit Scoring
 * Max: 200 points (20% of total founder score)
 */

import {
  extractNumbers,
  hasPersonalExperience,
  hasValidationIndicators,
  hasQuantification,
  parseDuration,
  getWordCount,
} from '@/lib/utils/text-analysis';

/**
 * Score: Problem Origin Story
 * Max: 100 points
 */
export const scoreProblemOrigin = (
  story: string,
  _followUpAnswers?: string[]
): number => {
  let score = 0;

  // Personal experience depth (0-40 points)
  if (hasPersonalExperience(story)) {
    score += 25; // Base points for personal experience

    // Time depth bonus (0-15 points)
    const timeMatch = story.match(/(\d+)\s*(year|month|week)/gi);
    if (timeMatch) {
      const duration = parseDuration(timeMatch[0]);
      if (duration >= 12) score += 15; // 1+ year
      else if (duration >= 6) score += 10; // 6+ months
      else if (duration >= 3) score += 5; // 3+ months
    }
  } else {
    // Observed problem (weaker signal)
    const observationWords = ['i saw', 'i noticed', 'i observed', 'i found'];
    const hasObservation = observationWords.some(word =>
      story.toLowerCase().includes(word)
    );
    score += hasObservation ? 10 : 5;
  }

  // Quantification (0-30 points)
  const hasNumbers = extractNumbers(story).length > 0;

  if (hasQuantification(story)) {
    score += 20; // Quantified impact with units

    // Specificity bonus for multiple numbers
    const numberCount = extractNumbers(story).length;
    score += Math.min(numberCount * 2, 10); // Up to 10 bonus points
  } else if (hasNumbers) {
    score += 10; // Some quantification
  }

  // Validation evidence (0-20 points)
  if (hasValidationIndicators(story)) {
    score += 12;

    // Evidence of quantified demand
    const demandPattern = /\d+\s*(people|customers|companies|users|requests|asked)/i;
    if (demandPattern.test(story)) {
      score += 8; // Quantified validation
    }
  }

  // Length and detail (0-10 points)
  const wordCount = getWordCount(story);
  if (wordCount >= 200) score += 10;
  else if (wordCount >= 150) score += 7;
  else if (wordCount >= 100) score += 5;
  else if (wordCount >= 50) score += 2;

  return Math.min(score, 100);
};

/**
 * Score: Unique Advantage
 * Max: 100 points
 */
export const scoreUniqueAdvantage = (
  selections: string[],
  explanation: string
): number => {
  let score = 0;

  // Selection scoring (0-50 points)
  const advantageWeights: Record<string, number> = {
    'industry-experience': 15,
    'technical-skills': 12,
    'customer-relationships': 20, // Strongest signal
    'proprietary-insight': 18,
    'relevant-failure': 12,
    'distribution-advantage': 15,
  };

  const selectedScore = selections.reduce(
    (sum, sel) => sum + (advantageWeights[sel] || 0),
    0
  );
  score += Math.min(selectedScore, 50);

  // Explanation depth (0-20 points)
  const wordCount = getWordCount(explanation);
  if (wordCount >= 150) score += 20;
  else if (wordCount >= 100) score += 15;
  else if (wordCount >= 50) score += 10;
  else if (wordCount >= 25) score += 5;

  // Specificity indicators (bonus up to 20 points)
  const specificityScore = calculateSpecificityScore(explanation);
  score += specificityScore;

  // Cross-validation bonus (0-10 points)
  // If they selected customer relationships + have strong evidence
  if (selections.includes('customer-relationships')) {
    const commitmentWords = ['loi', 'letter of intent', 'signed', 'contract', 'agreement'];
    const hasCommitment = commitmentWords.some(word =>
      explanation.toLowerCase().includes(word)
    );

    if (hasCommitment) {
      score += 10; // Strong validation
    } else if (hasValidationIndicators(explanation)) {
      score += 5; // Weak validation
    }
  }

  return Math.min(score, 100);
};

/**
 * Calculate specificity score based on concrete details
 */
function calculateSpecificityScore(text: string): number {
  let score = 0;

  // Company names (proper capitalization)
  if (/\b(at|worked|joined|from)\s+[A-Z]\w+/g.test(text)) {
    score += 5;
  }

  // Numbers with context
  if (/\d+\s*(year|customer|user|client|partner|company)/gi.test(text)) {
    score += 7;
  }

  // Proper names (people)
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) {
    score += 3;
  }

  // Legal commitments
  if (/(LOI|letter of intent|contract|signed|agreement)/i.test(text)) {
    score += 5;
  }

  return Math.min(score, 20);
}

/**
 * Calculate total Founder-Problem Fit score
 * Max: 200 points
 */
export const calculateProblemFitScore = (data: {
  problemStory: string;
  problemFollowUps?: string[];
  advantages: string[];
  advantageExplanation: string;
}): {
  total: number;
  breakdown: {
    problemOrigin: number;
    uniqueAdvantage: number;
  };
  feedback: string[];
} => {
  const problemOriginScore = scoreProblemOrigin(
    data.problemStory,
    data.problemFollowUps
  );
  const uniqueAdvantageScore = scoreUniqueAdvantage(
    data.advantages,
    data.advantageExplanation
  );

  const total = problemOriginScore + uniqueAdvantageScore;

  // Generate feedback
  const feedback: string[] = [];

  if (problemOriginScore < 50) {
    feedback.push('Consider adding more personal details about how you experienced this problem');
  }
  if (problemOriginScore >= 80) {
    feedback.push('Strong personal connection to the problem - this is exactly what investors look for');
  }

  if (uniqueAdvantageScore < 50) {
    feedback.push('Try to be more specific about your unique advantages with concrete examples');
  }
  if (uniqueAdvantageScore >= 80) {
    feedback.push('Excellent articulation of your competitive advantages');
  }

  return {
    total,
    breakdown: {
      problemOrigin: problemOriginScore,
      uniqueAdvantage: uniqueAdvantageScore,
    },
    feedback,
  };
};
