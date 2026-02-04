/**
 * Founder & Assessment Type Definitions
 * Centralized type definitions for founder data
 */

export interface FounderProfile {
  fullName: string;
  email: string;
  stage: string;
  funding: string;
  timeCommitment: string;
  startupName?: string;
  industry?: string;
  description?: string;
}

export interface AssessmentData {
  // Section A: Founder-Problem Fit
  problemStory: string;
  problemFollowUps?: string[];
  advantages?: string[];
  advantageExplanation?: string;

  // Section B: Customer Understanding
  customerType?: string;
  conversationDate?: Date | null;
  customerQuote?: string;
  customerSurprise?: string;
  customerCommitment?: string;
  conversationCount?: number;
  customerList?: string[];

  // Failed Assumptions
  failedBelief?: string;
  failedReasoning?: string;
  failedDiscovery?: string;
  failedChange?: string;

  // Section C: Execution
  tested?: string;
  buildTime?: number;
  measurement?: string;
  results?: string;
  learned?: string;
  changed?: string;

  // Section D: Market Realism
  targetCustomers?: number;
  talkToCount?: number;
  conversionRate?: number;
  avgContractValue?: number;
  customerLifetimeMonths?: number;
  validationChecks?: string[];

  // Section E: Go-to-Market
  icpDescription?: string;
  channelsTried?: string[];
  channelResults?: {
    [key: string]: { spend: number; conversions: number; cac: number };
  };
  currentCAC?: number;
  targetCAC?: number;
  messagingTested?: boolean;
  messagingResults?: string;

  // Section F: Financial Health
  revenueModel?: string;
  mrr?: number;
  arr?: number;
  monthlyBurn?: number;
  runway?: number;
  cogs?: number;
  averageDealSize?: number;
  projectedRevenue12mo?: number;
  revenueAssumptions?: string;
  previousMrr?: number;

  // Section G: Resilience
  hardestMoment?: string;
  quitScale?: number;
  whatKeptGoing?: string;
}

export interface MetricsData {
  // Financial Metrics
  mrr: number;
  arr: number;
  burn: number;
  runway: number;
  cogs: number;
  grossMargin: number;

  // Customer Metrics
  customers: number;
  mrrGrowth: number;
  churnRate: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;

  // Market Metrics
  tam: number;
  sam: number;
  conversionRate: number;

  // Calculated At
  calculatedAt: Date;
}
