/**
 * RAG (Retrieval-Augmented Generation) types for Q-Score semantic evaluation.
 * These types are used across the answer evaluator, retrieval, and dimension calculators.
 */

/**
 * Per-field quality scores (0–100) returned by the LLM answer evaluator.
 * Replaces character-count heuristics with semantic substance scoring.
 *
 * Scoring guide:
 *  0–30  → Generic / vague / could apply to any startup
 * 31–60  → Somewhat specific, some concrete details
 * 61–80  → Specific, verifiable, shows real experience
 * 81–100 → Highly specific, concrete data points, compelling narrative
 */
export interface AnswerQualityScores {
  // Team dimension
  problemStory: number;          // Domain expertise / founder-market fit
  advantageExplanation: number;  // Unfair advantage / moat articulation

  // Product dimension
  customerQuote: number;         // Quality of customer evidence
  customerSurprise: number;      // Depth of customer learning
  failedBelief: number;          // Intellectual honesty about assumptions
  failedDiscovery: number;       // What they actually learned from failure

  // GTM dimension
  icpDescription: number;        // ICP specificity (role, company size, pain trigger)
  messagingResults: number;      // Quality of messaging test documentation
}

/**
 * Market claim validation — structured benchmark comparison.
 * Derived by comparing founder's numbers against knowledge base benchmarks.
 */
export interface MarketValidation {
  tamRealistic: 'realistic' | 'optimistic' | 'unrealistic';
  conversionRateRealistic: 'realistic' | 'optimistic' | 'unrealistic';
  ltvCacRealistic: 'realistic' | 'optimistic' | 'unrealistic';
  /** Human-readable context string retrieved from knowledge base for this sector */
  benchmarkContext: string;
}

/**
 * Full semantic evaluation result — the output of the RAG layer.
 * Passed into dimension calculators to replace rule-based text heuristics.
 */
export interface SemanticEvaluation {
  answerQuality: AnswerQualityScores;
  marketValidation: MarketValidation;
  /** IDs of knowledge chunks that were retrieved and used */
  retrievedChunkIds: string[];
  evaluatedAt: Date;
  /** Whether LLM evaluation succeeded (false = fell back to heuristics) */
  success: boolean;
  errorMessage?: string;
}

/** Partial scores to use when only some fields are available */
export type PartialAnswerQuality = Partial<AnswerQualityScores>;

// ─────────────────────────────────────────────────────────────────────────────
// RAG Enhancement Types (Phase 1-3)
// ─────────────────────────────────────────────────────────────────────────────

/** Evidence verdict from cross-referencing assessment claims against artifacts */
export type EvidenceVerdict = 'corroborated' | 'conflicting' | 'unverified';

/** Single evidence item from vector search */
export interface EvidenceItem {
  claim: string;
  evidence: string;
  artifactType: string;
  similarity: number;
  verdict: EvidenceVerdict;
  dimension?: string;
}

/** Result of assembling evidence context for a user */
export interface EvidenceContext {
  corroborations: EvidenceItem[];
  conflicts: EvidenceItem[];
  /** 'all' when user has zero embeddings (cold start) */
  unverified: EvidenceItem[] | 'all';
  /** 0-1, drives blender behavior. 0 = skip evidence layer entirely */
  confidence: number;
}

/** Extended SemanticEvaluation with RAG metadata */
export interface EnhancedSemanticEvaluation extends SemanticEvaluation {
  /** 0-1, how much RAG data was available for scoring */
  ragConfidence?: number;
  /** Human-readable evidence citations from internal artifact search */
  evidenceSummary?: string[];
  /** Which benchmark sources were used for market validation */
  benchmarkSources?: string[];
  /** How this score was produced */
  scoringMethod?: 'rag' | 'heuristic' | 'blended';
}
