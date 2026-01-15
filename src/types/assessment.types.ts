/**
 * Assessment Domain Types
 * Centralized type definitions for the founder assessment flow
 */

// ============================================================================
// ASSESSMENT DATA STRUCTURES
// ============================================================================

export interface AssessmentData {
  // Section A: Founder-Problem Fit
  problemStory: string;
  problemFollowUps: string[];
  advantages: string[];
  advantageExplanation: string;

  // Section B: Customer Understanding
  customerType: string;
  conversationDate: Date | null;
  customerQuote: string;
  customerSurprise: string;
  customerCommitment: string;
  conversationCount: number;
  customerList: string[];

  // Failed Assumptions
  failedBelief: string;
  failedReasoning: string;
  failedDiscovery: string;
  failedChange: string;

  // Section C: Execution
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;

  // Section D: Market Realism
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  customerLifetimeMonths: number;
  validationChecks: string[];

  // Section E: Resilience
  hardestMoment: string;
  quitScale: number;
  whatKeptGoing: string;
}

// ============================================================================
// ASSESSMENT SECTIONS
// ============================================================================

export interface AssessmentSection {
  id: string;
  title: string;
  category: string;
  time: number;
  icon: React.ComponentType<{ className?: string }>;
  points: number;
}

export type AssessmentSectionId =
  | 'problem-origin'
  | 'unique-advantage'
  | 'customer-evidence'
  | 'failed-assumptions'
  | 'learning-velocity'
  | 'market-sizing'
  | 'resilience';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// SCORING TYPES
// ============================================================================

export interface ScoreBreakdown {
  total: number;
  breakdown: {
    problemFit: number;
    customerUnderstanding: number;
    execution: number;
    marketRealism: number;
    resilience: number;
  };
}

export interface QScore {
  totalScore: number;
  percentile: number;
  grade: string;
  founderScore: {
    total: number;
    breakdown: ScoreBreakdown['breakdown'];
  };
  overallFeedback: string[];
  investorReadiness: {
    score: number;
    level: string;
    description: string;
  };
}

// ============================================================================
// FORM COMPONENT PROPS
// ============================================================================

export interface FormStepProps<T = string | number | Date | null | string[]> {
  value: T;
  onChange: (value: T) => void;
  errors?: ValidationError[];
  isLoading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProblemOriginProps extends FormStepProps<string> {}

export interface UniqueAdvantageProps {
  selectedAdvantages: string[];
  explanation: string;
  onAdvantagesChange: (advantages: string[]) => void;
  onExplanationChange: (explanation: string) => void;
  errors?: ValidationError[];
}

export interface CustomerEvidenceData {
  customerType: string;
  conversationDate: Date | null;
  customerQuote: string;
  customerSurprise: string;
  customerCommitment: string;
  conversationCount: number;
  customerList: string[];
}

export interface CustomerEvidenceProps {
  data: CustomerEvidenceData;
  onChange: (field: keyof CustomerEvidenceData, value: string | Date | null | number | string[]) => void;
  errors?: ValidationError[];
}

export interface FailedAssumptionsData {
  failedBelief: string;
  failedReasoning: string;
  failedDiscovery: string;
  failedChange: string;
}

export interface LearningVelocityData {
  tested: string;
  buildTime: number;
  measurement: string;
  results: string;
  learned: string;
  changed: string;
}

export interface MarketCalculatorData {
  targetCustomers: number;
  talkToCount: number;
  conversionRate: number;
  avgContractValue: number;
  customerLifetimeMonths: number;
  validationChecks: string[];
}

export interface ResilienceData {
  hardestMoment: string;
  quitScale: number;
  whatKeptGoing: string;
}
