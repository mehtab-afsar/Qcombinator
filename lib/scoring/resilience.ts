/**
 * Resilience & Determination Scoring
 * Max: 100 points (10% of total founder score)
 */

import { getWordCount } from '@/lib/utils/text-analysis';

/**
 * Score: Hardest Moment & Response
 * Max: 100 points
 */
export const scoreResilience = (data: {
  story: string;
  quitScale: number; // 1-10, how close to quitting
  reason: string; // What kept you going
}): number => {
  let score = 0;

  // Adversity severity (0-35 points)
  const adversityWords = [
    'failed', 'rejected', 'lost', 'quit', 'fired', 'broke',
    'ran out', 'couldn\'t', 'crisis', 'disaster', 'wrong',
    'mistake', 'terrible', 'devastating', 'collapse'
  ];
  const adversityCount = adversityWords.filter(w =>
    data.story.toLowerCase().includes(w)
  ).length;

  if (adversityCount >= 3) {
    score += 25; // Significant adversity

    // Specific details bonus
    if (getWordCount(data.story) >= 100) score += 10;
  } else if (adversityCount >= 1) {
    score += 15; // Some adversity
  } else {
    score += 5; // Minimal adversity mentioned
  }

  // Considered quitting but didn't (0-35 points)
  // The sweet spot is 7-9: serious consideration but pushed through
  if (data.quitScale >= 7 && data.quitScale <= 9) {
    score += 35; // Almost quit but showed resilience
  } else if (data.quitScale >= 5 && data.quitScale < 7) {
    score += 25; // Thought about it
  } else if (data.quitScale >= 3 && data.quitScale < 5) {
    score += 15; // Some doubt
  } else if (data.quitScale < 3) {
    score += 10; // Never considered quitting (might be lying or not facing real adversity)
  } else {
    score += 5; // 10/10 quit scale means they did quit
  }

  // Intrinsic motivation (0-30 points)
  const intrinsicWords = [
    'believe', 'mission', 'customers need', 'problem matters',
    'committed', 'won\'t give up', 'have to solve', 'passion',
    'care about', 'important', 'make a difference'
  ];
  const motivationCount = intrinsicWords.filter(w =>
    data.reason.toLowerCase().includes(w)
  ).length;

  if (motivationCount >= 3) {
    score += 30; // Strong intrinsic motivation
  } else if (motivationCount >= 2) {
    score += 22; // Good motivation
  } else if (motivationCount >= 1) {
    score += 15; // Some intrinsic motivation
  } else if (getWordCount(data.reason) >= 50) {
    score += 10; // At least detailed, even if not intrinsic
  } else {
    score += 5; // Weak or extrinsic motivation
  }

  return Math.min(score, 100);
};

/**
 * Calculate total Resilience score with feedback
 */
export const calculateResilienceScore = (data: {
  story: string;
  quitScale: number;
  reason: string;
}): {
  total: number;
  feedback: string[];
  grade: string;
  resilienceLevel: string;
} => {
  const total = scoreResilience(data);

  const feedback: string[] = [];
  let resilienceLevel = '';

  // Determine resilience level
  if (total >= 85) {
    resilienceLevel = 'Exceptional';
    feedback.push('You show exceptional resilience - the kind that gets through the hardest startup challenges');
  } else if (total >= 70) {
    resilienceLevel = 'Strong';
    feedback.push('Strong resilience - you have what it takes to push through setbacks');
  } else if (total >= 55) {
    resilienceLevel = 'Good';
    feedback.push('Good resilience, but consider what will keep you going when things get really hard');
  } else if (total >= 40) {
    resilienceLevel = 'Developing';
    feedback.push('Your resilience is still developing - startups will test you more than you expect');
  } else {
    resilienceLevel = 'Needs Work';
    feedback.push('Reflect deeply on your commitment - the startup journey requires extraordinary perseverance');
  }

  // Specific feedback based on components
  if (data.quitScale >= 7) {
    feedback.push('Facing near-quit moments and pushing through is exactly what shows true determination');
  }

  const intrinsicWords = ['believe', 'mission', 'customers', 'problem', 'care'];
  const hasIntrinsic = intrinsicWords.some(w => data.reason.toLowerCase().includes(w));

  if (!hasIntrinsic) {
    feedback.push('Try to connect with the deeper "why" - intrinsic motivation outlasts external rewards');
  }

  if (getWordCount(data.story) < 50) {
    feedback.push('Share more details about your hardest moment - specifics reveal real adversity');
  }

  let grade = 'F';
  if (total >= 90) grade = 'A';
  else if (total >= 75) grade = 'B';
  else if (total >= 60) grade = 'C';
  else if (total >= 45) grade = 'D';

  return {
    total,
    feedback,
    grade,
    resilienceLevel,
  };
};
