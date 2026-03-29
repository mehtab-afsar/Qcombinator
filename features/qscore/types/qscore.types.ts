/**
 * QScore Type Definitions
 * Merged from lib/scoring/prd-types.ts and app/types/edge-alpha.ts
 */

// ============================================================================
// PRD-ALIGNED Q-SCORE TYPES (6 Dimensions)
// ============================================================================

export interface DimensionScore {
  score: number; // 0-100 normalized score
  weight: number; // PRD weight (0.12 to 0.20)
  rawPoints: number; // Actual points earned
  maxPoints: number; // Maximum possible points
  trend?: 'up' | 'down' | 'neutral';
  change?: number; // Change from previous assessment
}

/** RAG scoring metadata (from enhanced evaluation pipeline) */
export interface RAGMetadata {
  scoringMethod: 'rag' | 'heuristic' | 'blended';
  ragConfidence: number;
  evidenceSummary: string[];
}

export interface PRDQScore {
  overall: number; // 0-100 weighted average (decay-adjusted when stale)
  rawOverall?: number; // Stored score before decay
  decayApplied?: boolean; // true when score is older than 90 days
  daysSince?: number; // Days since last assessment
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
  /** RAG scoring metadata (available when score was calculated with enhanced pipeline) */
  ragMetadata?: RAGMetadata | null;
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

// ── Data source tracking ─────────────────────────────────────────────────────
// Tracks where key numeric fields came from.
// Stripe-verified fields get full weight; documents get 0.85; self-reported 0.55.
export type DataSourceType = 'stripe' | 'document' | 'self_reported';

export type DataSourceField =
  | 'mrr' | 'arr' | 'monthlyBurn' | 'runway' | 'cogs'
  | 'targetCustomers' | 'lifetimeValue' | 'conversionRate'
  | 'costPerAcquisition' | 'conversationCount' | 'customerCommitment';

export type DataSourceMap = Partial<Record<DataSourceField, DataSourceType>>;

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

  // Market Realism (for Market dimension) — optional, may not be available from onboarding
  targetCustomers?: number;
  conversionRate?: number;
  dailyActivity?: number;
  lifetimeValue?: number;
  costPerAcquisition?: number;

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

  // Data source provenance — set by the calculate route before scoring
  // Tells the confidence system which fields came from verified sources
  dataSourceMap?: DataSourceMap;

  // ── P2: Market Potential sub-indicators ───────────────────────────────────
  p2?: {
    tamDescription?: string;       // 2.1 Founder's stated TAM with reasoning
    marketUrgency?: string;        // 2.2 Why now — regulatory/tech/social trigger
    valuePool?: string;            // 2.3 Total economic value in the problem space
    expansionPotential?: string;   // 2.4 Adjacent markets / international paths
    competitorCount?: number;      // 2.5 Number of known direct competitors
    competitorDensityContext?: string; // 2.5 Additional competitive context
  };

  // ── P3: IP / Defensibility sub-indicators ─────────────────────────────────
  p3?: {
    hasPatent?: boolean;           // 3.1 Patent filed or granted
    patentDescription?: string;    // 3.1 Patent claim / abstract
    technicalDepth?: string;       // 3.2 Proprietary technology description
    knowHowDensity?: string;       // 3.3 Trade secrets / tacit knowledge held by team
    buildComplexity?: string;      // 3.4 Why is this hard to build (time, talent, data)
    replicationCostUsd?: number;   // 3.5 Estimated cost for a well-funded competitor to replicate ($)
  };

  // ── P4: Founder / Team sub-indicators ─────────────────────────────────────
  p4?: {
    domainYears?: number;          // 4.1 Years working in this specific domain
    founderMarketFit?: string;     // 4.2 Narrative: why this founder for this market
    priorExits?: number;           // 4.3 Successful exits or companies built before
    teamCoverage?: string[];       // 4.4 Leadership functions covered (e.g. ['tech','sales','product'])
    teamCohesionMonths?: number;   // 4.5 How long the core team has worked together
    teamChurnRecent?: boolean;     // IQ v2: recent team churn flag
  };

  // ── P5: Structural Impact sub-indicators ──────────────────────────────────
  p5?: {
    climateLeverage?: string;       // 5.1 Climate/environmental impact claim
    socialImpact?: string;          // 5.2 Resource efficiency / social impact
    revenueImpactLink?: string;     // 5.3 Development relevance
    scalingMechanism?: string;      // 5.4 Business model alignment to impact
    viksitBharatAlignment?: string; // 5.5 Strategic relevance (Viksit Bharat / India priority)
    // IQ v2 extended
    resourceEfficiency?: string;
    developmentRelevance?: string;
    businessModelAlignment?: string;
    strategicRelevance?: string;
  };

  // ── IQ v2: additional fields ───────────────────────────────────────────────
  hasPayingCustomers?: boolean;
  payingCustomerDetail?: string;
  salesCycleLength?: string;
  hasRetention?: boolean;
  retentionDetail?: string;
  largestContractUsd?: number;
  p1EarlySignalScore?: number;
  replicationTimeMonths?: number;
  teamChurnRecent?: boolean;
  /** IQ v2 score version tag */
  scoreVersion?: 'v1_prd' | 'v2_iq';
}

// ============================================================================
// EDGE ALPHA IQ SCORE v2 TYPES (30 indicators, constant denominator 150)
// ============================================================================

import type { DataQuality } from './data-quality.types'

/** Score stage tiers for rubric selection */
export type ScoreStage = 'early' | 'mid' | 'growth'

/** Startup track determines P5 scoring */
export type StartupTrack = 'commercial' | 'impact'

/** Per-indicator result */
export interface IndicatorScore {
  id: string             // e.g. '1.1', '3.4', '6.2'
  name: string
  rawScore: number       // 0.0–5.0 in 0.5 increments; 0 = excluded
  excluded: boolean
  exclusionReason?: string
  dataQuality: DataQuality
  vcAlert?: string       // Set by reconciliation engine (flag only, never overrides rawScore)
  subScore?: number      // LLM-extracted qualitative sub-score (1.0–5.0)
}

/** Per-parameter rollup (P1–P6) */
export interface ParameterScore {
  id: string             // 'p1' through 'p6'
  name: string
  weight: number         // Sector + stage blended weight
  indicators: IndicatorScore[]
  /** Weighted contribution to finalIQ = Σ(rawScores) for this parameter's indicators */
  rawSum: number
  /** Average rawScore for non-excluded indicators (display only) */
  averageScore: number
}

/** Full IQ Score result */
export interface IQScoreResult {
  /** Final score: Σ(all 30 rawScores) / 150 × 100 */
  finalIQ: number
  /** Score from non-excluded indicators only: Σ(non-excluded) / (N_active × 5) × 100 */
  availableIQ: number
  grade: PRDQScore['grade']
  parameters: ParameterScore[]
  indicatorsActive: number     // non-excluded count
  indicatorsExcluded: number
  track: StartupTrack
  sector: string
  stage: ScoreStage
  reconciliationFlags: string[]
  validationWarnings: string[]
  calculatedAt: Date
}

// ── P5 new fields (add to AssessmentData.p5) ──────────────────────────────────
// Extended p5 fields already on AssessmentData; keeping backward compat.
// New fields for the IQ v2 impact track indicators:
export interface P5DataV2 {
  climateLeverage?: string
  socialImpact?: string
  revenueImpactLink?: string
  scalingMechanism?: string
  viksitBharatAlignment?: string
  // v2 additions
  resourceEfficiency?: string
  developmentRelevance?: string
  businessModelAlignment?: string
  strategicRelevance?: string
}

// ============================================================================
// LEGACY Q-SCORE TYPES (from edge-alpha.ts)
// ============================================================================

export interface LegacyDimensionScore {
  score: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface QScore {
  overall: number;
  previousWeek: number | null;
  percentile: number | null;
  breakdown: {
    market: LegacyDimensionScore;
    product: LegacyDimensionScore;
    goToMarket: LegacyDimensionScore; // NEW - 6th dimension
    financial: LegacyDimensionScore;
    team: LegacyDimensionScore;
    traction: LegacyDimensionScore;
  };
}

export type QScoreDimension = keyof QScore['breakdown'];

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: RecommendationPriority;
  dimension: QScoreDimension;
  ctaText: string;
  ctaLink: string;
  icon?: string;
  completed: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PitchSummary {
  oneLiner: string;
  keyMetrics: string[];
  matchReason: string;
}
