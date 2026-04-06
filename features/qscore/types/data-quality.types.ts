/**
 * Edge Alpha IQ Score v2 — Data Quality Types
 *
 * DataQuality.confidence is applied as a multiplier in the finalIQ formula:
 *   effectiveScore = rawScore × clamp(confidence / 0.90, 0.50, 1.00)
 * Verified data (≥0.90) → 1.0×; self-reported (≤0.45) → 0.50×.
 * DataQuality also drives the DataQuality badge on the UI and adjusts vcAlert text.
 */

export type VerificationLevel = 'unverified' | 'doc_supported' | 'verified'

export type DataSource =
  | 'founder_claim'
  | 'document'
  | 'api_verified'
  | 'third_party'

export interface DataQuality {
  source: DataSource
  verificationLevel: VerificationLevel
  /** 0.0–1.0. Applied as multiplier in finalIQ: clamp(confidence/0.90, 0.50, 1.00) */
  confidence: number
  reasons: string[]
}

/** Baseline confidence by source (before adjustments) */
export const BASE_CONFIDENCE: Record<DataSource, number> = {
  api_verified:   0.95,
  third_party:    0.90,
  document:       0.80,
  founder_claim:  0.60,
}

/** Document sub-type adjustments (applied on top of BASE_CONFIDENCE['document']) */
export const DOCUMENT_CONFIDENCE: Record<string, number> = {
  stripe:        0.95,
  spreadsheet:   0.85,
  pitch_deck:    0.70,
  third_party:   0.90,
  chat:          0.60,
  doc_financial: 0.85,
  doc_other:     0.80,
}

/** Confidence adjustment rules */
export const CONFIDENCE_ADJUSTMENTS = {
  specificity:          +0.05,
  vagueness:            -0.10,
  cross_source_conflict:-0.15,
  cross_source_agree:   +0.05,
  data_age_stale:       -0.05,   // data > 12 months old
} as const
