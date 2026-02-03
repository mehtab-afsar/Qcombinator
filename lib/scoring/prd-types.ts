/**
 * PRD-Aligned Q-Score Types
 * 6-dimension weighted model per PRD requirements
 */

export interface DimensionScore {
  score: number; // 0-100 normalized score
  weight: number; // PRD weight (0.12 to 0.20)
  rawPoints: number; // Actual points earned
  maxPoints: number; // Maximum possible points
  trend?: 'up' | 'down' | 'neutral';
  change?: number; // Change from previous assessment
}

export interface PRDQScore {
  overall: number; // 0-100 weighted average
  percentile: number | null; // Percentile ranking vs cohort
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  breakdown: {
    market: DimensionScore;
    product: DimensionScore;
    goToMarket: DimensionScore;
    financial: DimensionScore;
    team: DimensionScore;
    traction: DimensionScore;
  };
  calculatedAt: Date;
}

// PRD Weight Configuration
export const PRD_WEIGHTS = {
  market: 0.20,      // 20% - Market opportunity and timing
  product: 0.18,     // 18% - Product quality and validation
  goToMarket: 0.17,  // 17% - GTM strategy and execution
  financial: 0.18,   // 18% - Financial health and projections
  team: 0.15,        // 15% - Team strength and experience
  traction: 0.12     // 12% - Traction and growth
} as const;

// Grade thresholds
export const GRADE_THRESHOLDS = {
  'A+': 95,
  'A': 90,
  'B+': 85,
  'B': 80,
  'C+': 75,
  'C': 70,
  'D': 60,
  'F': 0
} as const;

// Helper function to calculate grade
export function calculateGrade(score: number): PRDQScore['grade'] {
  if (score >= GRADE_THRESHOLDS['A+']) return 'A+';
  if (score >= GRADE_THRESHOLDS['A']) return 'A';
  if (score >= GRADE_THRESHOLDS['B+']) return 'B+';
  if (score >= GRADE_THRESHOLDS['B']) return 'B';
  if (score >= GRADE_THRESHOLDS['C+']) return 'C+';
  if (score >= GRADE_THRESHOLDS['C']) return 'C';
  if (score >= GRADE_THRESHOLDS['D']) return 'D';
  return 'F';
}

// Assessment data structure (maps to existing assessment form)
export interface AssessmentData {
  // Problem Origin (for Team dimension)
  problemStory: string;
  problemFollowUps?: string[];

  // Unique Advantage (for Team dimension)
  advantages: string[];
  advantageExplanation: string;

  // Customer Evidence (for Product & Traction dimensions)
  customerType: string;
  conversationDate: Date | null;
  customerQuote: string;
  customerSurprise: string;
  customerCommitment: string;
  conversationCount: number;
  customerList: string[];

  // Failed Assumptions (for Product dimension)
  failedBelief: string;
  failedReasoning: string;
  failedDiscovery: string;
  failedChange: string;

  // Learning Velocity (for Product dimension)
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;

  // Market Realism (for Market dimension)
  targetCustomers: number;
  conversionRate: number;
  dailyActivity: number;
  lifetimeValue: number;
  costPerAcquisition: number;

  // Resilience (for Team dimension)
  hardshipStory: string;
  hardshipType?: string;

  // Go-to-Market (NEW - for GTM dimension)
  gtm?: {
    icpDescription: string;
    channelsTried: string[];
    channelResults: {
      channel: string;
      spend?: number;
      conversions?: number;
      cac?: number;
    }[];
    currentCAC?: number;
    targetCAC?: number;
    messagingTested: boolean;
    messagingResults?: string;
  };

  // Financial (NEW - for Financial dimension)
  financial?: {
    mrr?: number;
    arr?: number;
    monthlyBurn: number;
    runway?: number;
    cogs?: number;
    averageDealSize?: number;
    projectedRevenue12mo?: number;
    revenueAssumptions?: string;
  };
}
