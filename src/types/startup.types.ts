/**
 * Startup Profile Domain Types
 * Centralized type definitions for the startup profile flow
 */

// ============================================================================
// STARTUP PROFILE DATA STRUCTURES
// ============================================================================

export interface StartupProfileData {
  // Basics
  companyName: string;
  website: string;
  incorporation: string;
  foundedDate: string;
  industry: string;
  subIndustry: string;
  oneLiner: string;
  stage: string;

  // Problem & Solution
  problemStatement: string;
  whyNow: string;
  solution: string;
  uniquePosition: string;
  moat: string;

  // Market & Competition
  tamSize: string;
  customerPersona: string;
  businessModel: string;
  competitors: string[];
  differentiation: string;
  marketGrowth: string;

  // Traction & Metrics
  tractionType: string;
  mrr: string;
  arr: string;
  growthRate: string;
  customerCount: string;
  churnRate: string;
  cac: string;
  ltv: string;
  userInterviews: string;
  lois: string;
  pilots: string;
  waitlist: string;

  // Team
  coFounders: CoFounder[];
  advisors: string[];
  teamSize: string;
  keyHires: string[];
  equitySplit: string;

  // Fundraising
  raisingAmount: string;
  useOfFunds: string;
  previousFunding: string;
  runwayRemaining: string;
  targetCloseDate: string;
}

// ============================================================================
// RELATED TYPES
// ============================================================================

export interface CoFounder {
  name: string;
  role: string;
  linkedin?: string;
  equity: number;
}

export interface StartupProfileSection {
  id: string;
  title: string;
  time: number;
  icon: React.ComponentType<{ className?: string }> | null;
}

export type StartupSectionId =
  | 'basics'
  | 'problem-solution'
  | 'market'
  | 'traction'
  | 'team'
  | 'fundraising';

// ============================================================================
// CONSTANTS
// ============================================================================

export const INDUSTRIES = [
  'AI/ML',
  'SaaS',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-commerce',
  'Marketplace',
  'DevTools',
  'Cybersecurity',
  'Climate Tech',
  'Food Tech',
  'PropTech',
  'Gaming',
  'Consumer Apps',
  'Enterprise Software',
  'Hardware',
  'Biotech',
  'Other',
] as const;

export const INCORPORATION_TYPES = [
  { value: 'delaware-corp', label: 'Delaware C-Corporation', recommended: true },
  { value: 'llc', label: 'LLC' },
  { value: 'other-corp', label: 'Other Corporation' },
  { value: 'not-incorporated', label: 'Not Yet Incorporated' },
] as const;

export const STAGES = [
  { value: 'pre-product', label: 'Pre-Product', desc: 'Idea validation stage' },
  { value: 'mvp', label: 'MVP', desc: 'Minimum viable product built' },
  { value: 'beta', label: 'Beta', desc: 'Testing with early users' },
  { value: 'launched', label: 'Launched', desc: 'Product is live' },
  { value: 'growing', label: 'Growing', desc: 'Scaling and expanding' },
] as const;

export const BUSINESS_MODELS = [
  'B2B SaaS',
  'B2C Subscription',
  'Marketplace',
  'E-commerce',
  'Advertising',
  'Transaction Fees',
  'Freemium',
  'Enterprise Licensing',
  'Usage-based',
  'Other',
] as const;

export const USE_OF_FUNDS_OPTIONS = [
  'Product Development',
  'Sales & Marketing',
  'Team Expansion',
  'Operations',
  'Technology Infrastructure',
  'Market Expansion',
  'Inventory',
  'Working Capital',
] as const;
