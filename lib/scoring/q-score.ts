/**
 * Master Q-Score Calculation
 * Total: 1000 points
 * - Founder Score: 800 points (80%)
 * - Startup Score: 200 points (20%)
 */

import { calculateProblemFitScore } from './problem-fit';
import { calculateCustomerUnderstandingScore } from './customer-understanding';
import { calculateExecutionScore } from './execution';
import { calculateMarketRealismScore } from './market-realism';
import { calculateResilienceScore } from './resilience';

export interface FounderAssessmentData {
  // Section A: Founder-Problem Fit
  problemStory: string;
  problemFollowUps?: string[];
  advantages: string[];
  advantageExplanation: string;

  // Section B: Customer Understanding
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

  // Section C: Execution
  iteration: {
    tested: string;
    buildTime: number;
    measurement: string;
    results: string;
    learned: string;
    changed: string;
  };

  // Section D: Market Realism
  marketSizing: {
    targetCustomers: number;
    talkToCount: number;
    conversionRate: number;
    avgContractValue: number;
    customerLifetimeMonths: number;
    validationChecks: string[];
  };

  // Section E: Resilience
  resilience: {
    story: string;
    quitScale: number;
    reason: string;
  };
}

export interface StartupProfileData {
  // Problem/Solution
  problemStatement: string;
  solution: string;
  uniquePosition: string;
  moat: string;

  // Market
  tamSize: string;
  marketGrowth: string;
  customerPersona: string;
  businessModel: string;

  // Traction
  tractionType: string;
  mrr?: string;
  customerCount?: string;
  growthRate?: string;

  // Team
  teamSize: string;
  coFounders: any[];
  equitySplit: string;

  // Fundraising
  raisingAmount: string;
  useOfFunds: string;
}

/**
 * Score startup profile components
 * Max: 200 points (20% of total)
 */
export const scoreStartupProfile = (data: StartupProfileData): {
  total: number;
  breakdown: {
    problemSolution: number;
    market: number;
    traction: number;
    businessModel: number;
  };
} => {
  let problemSolution = 0;
  let market = 0;
  let traction = 0;
  let businessModel = 0;

  // Problem/Solution (50 points)
  if (data.problemStatement.length >= 200) problemSolution += 15;
  else if (data.problemStatement.length >= 100) problemSolution += 10;
  else if (data.problemStatement.length >= 50) problemSolution += 5;

  if (data.solution.length >= 200) problemSolution += 15;
  else if (data.solution.length >= 100) problemSolution += 10;
  else if (data.solution.length >= 50) problemSolution += 5;

  if (data.moat && data.moat.length >= 100) problemSolution += 20;
  else if (data.moat && data.moat.length >= 50) problemSolution += 10;

  // Market (50 points)
  if (data.tamSize && data.tamSize.length > 0) market += 15;
  if (data.marketGrowth && data.marketGrowth.length > 0) market += 10;
  if (data.customerPersona) market += 15;
  if (data.businessModel) market += 10;

  // Traction (50 points)
  if (data.tractionType === 'revenue') {
    if (data.mrr && parseInt(data.mrr) > 0) traction += 25;
    if (data.customerCount && parseInt(data.customerCount) > 0) traction += 15;
    if (data.growthRate) traction += 10;
  } else {
    // Pre-revenue traction is worth less
    traction += 20;
  }

  // Business Model (50 points)
  if (data.businessModel) businessModel += 20;
  if (data.raisingAmount && data.raisingAmount.length > 0) businessModel += 15;
  if (data.useOfFunds && data.useOfFunds.length >= 100) businessModel += 15;

  return {
    total: problemSolution + market + traction + businessModel,
    breakdown: {
      problemSolution,
      market,
      traction,
      businessModel,
    },
  };
};

/**
 * Calculate complete Q-Score
 */
export const calculateQScore = (
  assessmentData: FounderAssessmentData,
  profileData: StartupProfileData
): {
  totalScore: number;
  percentile: number;
  grade: string;
  founderScore: {
    total: number;
    breakdown: {
      problemFit: ReturnType<typeof calculateProblemFitScore>;
      customerUnderstanding: ReturnType<typeof calculateCustomerUnderstandingScore>;
      execution: ReturnType<typeof calculateExecutionScore>;
      marketRealism: ReturnType<typeof calculateMarketRealismScore>;
      resilience: ReturnType<typeof calculateResilienceScore>;
    };
  };
  startupScore: ReturnType<typeof scoreStartupProfile>;
  overallFeedback: string[];
  investorReadiness: {
    score: number; // 1-10
    level: string;
    description: string;
  };
} => {
  // Calculate founder score components (800 points)
  const problemFit = calculateProblemFitScore({
    problemStory: assessmentData.problemStory,
    problemFollowUps: assessmentData.problemFollowUps,
    advantages: assessmentData.advantages,
    advantageExplanation: assessmentData.advantageExplanation,
  });

  const customerUnderstanding = calculateCustomerUnderstandingScore({
    customerEvidence: assessmentData.customerEvidence,
    failedAssumptions: assessmentData.failedAssumptions,
  });

  const execution = calculateExecutionScore(assessmentData.iteration);

  const marketRealism = calculateMarketRealismScore(assessmentData.marketSizing);

  const resilience = calculateResilienceScore(assessmentData.resilience);

  const founderTotal =
    problemFit.total +
    customerUnderstanding.total +
    execution.total +
    marketRealism.total +
    resilience.total;

  // Calculate startup score (200 points)
  const startupScore = scoreStartupProfile(profileData);

  // Total Q-Score (1000 points)
  const totalScore = founderTotal + startupScore.total;

  // Calculate percentile (simplified - in production, compare to database)
  const percentile = Math.min(95, Math.floor((totalScore / 1000) * 100));

  // Determine grade
  let grade = 'F';
  if (totalScore >= 850) grade = 'A+';
  else if (totalScore >= 800) grade = 'A';
  else if (totalScore >= 750) grade = 'A-';
  else if (totalScore >= 700) grade = 'B+';
  else if (totalScore >= 650) grade = 'B';
  else if (totalScore >= 600) grade = 'B-';
  else if (totalScore >= 550) grade = 'C+';
  else if (totalScore >= 500) grade = 'C';
  else if (totalScore >= 450) grade = 'C-';
  else if (totalScore >= 400) grade = 'D';

  // Overall feedback
  const overallFeedback: string[] = [];

  if (totalScore >= 750) {
    overallFeedback.push('Outstanding profile - you\'re in the top tier of seed-stage founders');
  } else if (totalScore >= 650) {
    overallFeedback.push('Strong profile - you\'re ready to approach investors');
  } else if (totalScore >= 550) {
    overallFeedback.push('Good foundation - address the gaps below before approaching top-tier investors');
  } else if (totalScore >= 450) {
    overallFeedback.push('You have potential but need more customer validation and traction');
  } else {
    overallFeedback.push('Focus on talking to customers and building an MVP before fundraising');
  }

  // Component-specific feedback
  if (problemFit.total < 120) {
    overallFeedback.push('⚠️ Strengthen your founder-problem fit story');
  }
  if (customerUnderstanding.total < 180) {
    overallFeedback.push('⚠️ Talk to more customers - this is critical');
  }
  if (execution.total < 90) {
    overallFeedback.push('⚠️ Speed up your iteration cycles');
  }
  if (marketRealism.total < 90) {
    overallFeedback.push('⚠️ Revisit your market sizing assumptions');
  }

  // Investor readiness
  let investorReadiness: {
    score: number;
    level: string;
    description: string;
  };

  if (totalScore >= 800) {
    investorReadiness = {
      score: 9,
      level: 'Highly Ready',
      description: 'You\'re ready for tier-1 seed investors (a16z, Sequoia, Benchmark)',
    };
  } else if (totalScore >= 700) {
    investorReadiness = {
      score: 8,
      level: 'Ready',
      description: 'You\'re ready for seed investors. Focus on networking and warm intros.',
    };
  } else if (totalScore >= 600) {
    investorReadiness = {
      score: 6,
      level: 'Nearly Ready',
      description: 'You\'re close. Strengthen weak areas and add more customer validation.',
    };
  } else if (totalScore >= 500) {
    investorReadiness = {
      score: 5,
      level: 'Developing',
      description: 'Build more traction before approaching institutional investors.',
    };
  } else {
    investorReadiness = {
      score: 3,
      level: 'Not Ready',
      description: 'Focus on customer discovery and building your MVP first.',
    };
  }

  return {
    totalScore,
    percentile,
    grade,
    founderScore: {
      total: founderTotal,
      breakdown: {
        problemFit,
        customerUnderstanding,
        execution,
        marketRealism,
        resilience,
      },
    },
    startupScore,
    overallFeedback,
    investorReadiness,
  };
};

/**
 * Get letter grade from score
 */
export const getLetterGrade = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;

  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D';
  return 'F';
};
