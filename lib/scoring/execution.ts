/**
 * Execution & Learning Velocity Scoring
 * Max: 150 points (15% of total founder score)
 */

import {
  getWordCount,
  extractNumbers,
  hasSpecificExamples,
} from '@/lib/utils/text-analysis';

/**
 * Score: Build-Measure-Learn Cycle
 * Max: 150 points
 */
export const scoreLearningVelocity = (data: {
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;
}): number => {
  let score = 0;

  // Speed of iteration (0-40 points)
  const days = data.buildTime;
  if (days <= 7) score += 40; // Weekly iterations (exceptional)
  else if (days <= 14) score += 32; // Bi-weekly (very good)
  else if (days <= 30) score += 24; // Monthly (good)
  else if (days <= 60) score += 12; // Every 2 months (slow)
  else score += 4; // Too slow

  // Measurement rigor (0-40 points)
  const hasMetric = extractNumbers(data.measurement).length > 0 ||
                    extractNumbers(data.results).length > 0;
  const comparisonWords = ['vs', 'compared', 'before', 'after', 'baseline', 'goal', 'target'];
  const hasComparison = comparisonWords.some(w =>
    data.measurement.toLowerCase().includes(w) ||
    data.results.toLowerCase().includes(w)
  );

  if (hasMetric && hasComparison) score += 40; // Quantified + benchmarked
  else if (hasMetric) score += 28; // Quantified only
  else if (hasComparison) score += 16; // Qualitative comparison
  else score += 4; // No measurement framework

  // Learning depth (0-35 points)
  const learningWords = getWordCount(data.learned);
  if (learningWords >= 40) score += 35;
  else if (learningWords >= 25) score += 25;
  else if (learningWords >= 15) score += 15;
  else if (learningWords >= 5) score += 5;

  // Action taken (0-35 points)
  const changedWords = getWordCount(data.changed);
  const specificChanges = [
    'button', 'feature', 'flow', 'design', 'copy',
    'code', 'page', 'screen', 'added', 'removed', 'changed'
  ];
  const hasSpecificChange = specificChanges.some(w =>
    data.changed.toLowerCase().includes(w)
  );

  if (changedWords >= 30 && hasSpecificChange) score += 35;
  else if (changedWords >= 20) score += 25;
  else if (changedWords >= 10) score += 15;
  else if (changedWords >= 5) score += 8;

  return Math.min(score, 150);
};

/**
 * Calculate total Execution score
 */
export const calculateExecutionScore = (data: {
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;
}): {
  total: number;
  feedback: string[];
  grade: string;
} => {
  const total = scoreLearningVelocity(data);

  const feedback: string[] = [];

  if (data.buildTime > 30) {
    feedback.push('Try to shorten your iteration cycles - the best founders test weekly');
  }

  if (extractNumbers(data.results).length === 0) {
    feedback.push('Add specific metrics to measure success - "users liked it" is too vague');
  }

  if (total >= 120) {
    feedback.push('Excellent execution speed - you iterate and learn faster than most founders');
  }

  if (getWordCount(data.learned) < 20) {
    feedback.push('Elaborate more on what you learned - insights drive better decisions');
  }

  let grade = 'F';
  if (total >= 135) grade = 'A';
  else if (total >= 120) grade = 'B';
  else if (total >= 105) grade = 'C';
  else if (total >= 90) grade = 'D';

  return { total, feedback, grade };
};
