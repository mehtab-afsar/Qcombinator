/**
 * Q-Score Lite — shared types for the scoring engine. Fully independent of features/qscore/**.
 */

export type ParameterId =
  | 'founder_team'
  | 'market_attractiveness'
  | 'product_technical_depth'
  | 'commercial_momentum'
  | 'company_readiness'

export type IndicatorId =
  // Founder & Team
  | 'founder_track_record'
  | 'founder_market_fit'
  | 'team_completeness'
  | 'founder_credibility'
  // Market Attractiveness
  | 'market_category_signal'
  | 'competitive_position'
  | 'timing_tailwind'
  | 'press_analyst_coverage'
  // Product & Technical Depth
  | 'product_substance'
  | 'technical_depth'
  | 'ip_defensibility'
  | 'product_velocity'
  // Commercial Momentum
  | 'customer_evidence'
  | 'revenue_traction'
  | 'partnership_evidence'
  | 'growth_momentum'
  // Company Readiness
  | 'funding_history'
  | 'company_basics_verifiable'
  | 'digital_presence_quality'
  | 'regulatory_compliance'

export type RawScore = 0 | 1 | 2 | 3 | 4 | 5 | null

export type Directness = 'direct' | 'strong_proxy' | 'indirect_proxy' | 'speculative'

/** What the LLM extraction step outputs per indicator — semantic judgment only. */
export interface IndicatorExtraction {
  id: IndicatorId
  rawScore: RawScore
  citedUrls: string[]
  /** null iff rawScore is null — no score means no directness judgment either. */
  directness: Directness | null
  /** Nullable — there's nothing to explain when rawScore is null (no evidence found). */
  reasoning: string | null
}

/** What deterministic code adds on top — the full per-indicator breakdown, stored and displayed. */
export interface IndicatorResult extends IndicatorExtraction {
  weight: number
  reliability: number | null
  recency: number | null
  corroboration: number | null
  evidenceWeight: number | null
  indicatorScore: number | null
}

export interface ParameterScore {
  id: ParameterId
  label: string
  score: number | null
  activeCount: number
  totalCount: number
}

export interface QScoreLiteResult {
  qslScore: number
  confidencePct: number
  activeIndicatorCount: number
  parameters: ParameterScore[]
  indicators: IndicatorResult[]
}
