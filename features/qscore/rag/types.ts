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
