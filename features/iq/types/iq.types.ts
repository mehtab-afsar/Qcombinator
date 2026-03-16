/**
 * Edge Alpha IQ — Type Definitions
 * 25-indicator dynamic scoring engine
 */

// ─── Data Sources & Confidence ───────────────────────────────────────────────

export type DataSource =
  | 'stripe_api'               // Stripe restricted key — verified revenue data
  | 'patent_db'                // External patent API (future)
  | 'felix_artifact'           // Felix financial_summary artifact
  | 'harper_artifact'          // Harper hiring_plan artifact
  | 'atlas_artifact'           // Atlas competitive_matrix artifact
  | 'self_report_verified'     // Self-reported AND corroborated by artifact RAG
  | 'self_reported'            // Self-reported only, no corroboration
  | 'ai_reconciled_grounded'   // AI scored with real injected data (Tavily / artifact)
  | 'ai_reconciled_estimated'  // AI scored with limited/no grounding data
  | 'excluded';                // Structurally unavailable — normalized out

/** Confidence multipliers per data source */
export const CONFIDENCE_MAP: Record<DataSource, number> = {
  stripe_api: 1.00,
  patent_db: 0.95,
  felix_artifact: 0.85,
  harper_artifact: 0.80,
  atlas_artifact: 0.80,
  self_report_verified: 0.75,
  self_reported: 0.55,
  ai_reconciled_grounded: 0.70,
  ai_reconciled_estimated: 0.40,
  excluded: 0.00,
};

// ─── Consistency Flags ───────────────────────────────────────────────────────

export type ConsistencyFlagSeverity = 'high' | 'medium' | 'low';

export interface ConsistencyFlag {
  ruleCode: string;          // e.g. 'IP_DEVTIME_MISMATCH'
  description: string;       // human-readable explanation
  severity: ConsistencyFlagSeverity;
  indicatorsInvolved: string[]; // e.g. ['3.1', '3.4']
}

/** Confidence multipliers applied per flag severity */
export const FLAG_CONFIDENCE_PENALTY: Record<ConsistencyFlagSeverity, number> = {
  high: 0.70,    // confidence × 0.70
  medium: 0.85,  // confidence × 0.85
  low: 1.00,     // informational only
};

// ─── Evidence Citations ──────────────────────────────────────────────────────

export interface EvidenceCitation {
  text: string;          // verbatim quote from source
  source: string;        // artifact type or 'tavily_search' or 'stripe_api'
  similarity?: number;   // pgvector similarity score 0–1 (if from RAG)
}

// ─── Indicator Config (from DB) ──────────────────────────────────────────────

export interface IQIndicatorConfig {
  id: string;
  code: string;           // '1.1', '2.3', etc.
  parameterId: number;    // 1–5
  name: string;
  description: string;
  dataField: string;
  score1Max: number | null;   // raw value ≤ this → score 1
  score3Max: number | null;   // raw value ≤ this → score 3
  score5Min: number | null;   // raw value ≥ this → score 5
  higherIsBetter: boolean;
  aiReconciled: boolean;
  isActive: boolean;
  unit: string;
  benchmarkSource?: string;
  notes?: string;
}

// ─── Resolved Data ───────────────────────────────────────────────────────────

export interface ResolvedIndicatorData {
  value: number | null;
  source: DataSource;
  rawData?: Record<string, unknown>;   // full original data for audit
  missingReason?: string;              // why data is unavailable
}

// ─── AI Reconciler Output ────────────────────────────────────────────────────

export interface AIReconcilerResult {
  score: number;                     // 1–5
  reasoning: string;
  evidenceQuotes: string[];          // verbatim from injected context
  confidence: number;                // 0–1
  consensusDeviation?: number;       // |callA - callB|
  hallucinationDetected: boolean;
}

// ─── Per-Indicator Result ────────────────────────────────────────────────────

export interface IQIndicatorResult {
  code: string;
  name: string;
  parameterId: number;
  rawScore: number | null;           // 1–5 before confidence, null if excluded
  confidence: number;                // final confidence after source + flags
  effectiveScore: number;            // rawScore × confidence, 0 if excluded
  dataSource: DataSource;
  rawValue: number | null;           // actual measured value
  reasoning: string;
  evidenceCitations: EvidenceCitation[];
  consistencyFlags: ConsistencyFlag[];
  excluded: boolean;
}

// ─── IQ Score ────────────────────────────────────────────────────────────────

export type IQGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
export type IQScoringMethod = 'full' | 'partial' | 'estimated';

export interface IQParameterScore {
  parameterId: number;
  name: string;
  score: number;           // 0–5 effective weighted average for parameter
  weight: number;          // 0–1, sector-adjusted
  indicatorCount: number;
  excludedCount: number;
}

export interface IQScore {
  overall: number;                      // 0–5 effective weighted average
  normalizedScore: number;              // 0–100 for display
  grade: IQGrade;
  parameterScores: IQParameterScore[];
  indicators: IQIndicatorResult[];
  indicatorsUsed: number;
  indicatorsExcluded: number;
  scoringMethod: IQScoringMethod;
  sector: string;
  calculatedAt: Date;
}

// ─── Grade Thresholds ────────────────────────────────────────────────────────
// Applied to normalizedScore (0–100)

export const IQ_GRADE_THRESHOLDS: Record<IQGrade, number> = {
  'A+': 90,
  'A': 82,
  'B+': 74,
  'B': 66,
  'C+': 58,
  'C': 50,
  'D': 40,
  'F': 0,
};

export function calculateIQGrade(normalizedScore: number): IQGrade {
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['A+']) return 'A+';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['A']) return 'A';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['B+']) return 'B+';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['B']) return 'B';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['C+']) return 'C+';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['C']) return 'C';
  if (normalizedScore >= IQ_GRADE_THRESHOLDS['D']) return 'D';
  return 'F';
}

// ─── Parameter Names ─────────────────────────────────────────────────────────

export const PARAMETER_NAMES: Record<number, string> = {
  1: 'Market Readiness',
  2: 'Market Potential',
  3: 'IP / Defensibility',
  4: 'Founder / Team',
  5: 'Structural & Systemic Impact',
};
