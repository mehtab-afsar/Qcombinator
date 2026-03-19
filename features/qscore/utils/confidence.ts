/**
 * Confidence-Aware Scoring
 *
 * Calculates per-dimension confidence based on field coverage.
 * Adjusts raw scores to avoid misleading results from partial data.
 */

import { AssessmentData, DataSourceMap, DataSourceType } from '../types/qscore.types';

export interface DimensionConfidence {
  dimension: string;
  fieldsExpected: number;
  fieldsPresent: number;
  confidence: number; // 0-1
  status: 'none' | 'low' | 'medium' | 'high';
}

// Fields expected per dimension
const DIMENSION_FIELDS: Record<string, (data: AssessmentData) => unknown[]> = {
  market: (d) => [d.targetCustomers, d.lifetimeValue, d.conversionRate, d.dailyActivity, d.costPerAcquisition],
  product: (d) => [d.customerQuote, d.customerSurprise, d.customerCommitment, d.conversationCount, d.tested, d.measurement, d.results, d.failedBelief, d.failedDiscovery, d.failedChange],
  goToMarket: (d) => [d.gtm?.icpDescription, d.gtm?.channelsTried, d.gtm?.currentCAC, d.gtm?.messagingTested],
  financial: (d) => [d.financial?.mrr, d.financial?.monthlyBurn, d.financial?.runway, d.financial?.cogs],
  team: (d) => [d.problemStory, d.advantageExplanation, d.hardshipStory],
  traction: (d) => [d.conversationCount, d.customerCommitment, d.financial?.mrr],
};

function isPopulated(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function calculateConfidence(data: AssessmentData): Record<string, DimensionConfidence> {
  const result: Record<string, DimensionConfidence> = {};

  for (const [dimension, getFields] of Object.entries(DIMENSION_FIELDS)) {
    const fields = getFields(data);
    const present = fields.filter(isPopulated).length;
    const expected = fields.length;
    const confidence = expected > 0 ? present / expected : 0;

    let status: DimensionConfidence['status'];
    if (confidence === 0) status = 'none';
    else if (confidence < 0.3) status = 'low';
    else if (confidence < 0.7) status = 'medium';
    else status = 'high';

    result[dimension] = {
      dimension,
      fieldsExpected: expected,
      fieldsPresent: present,
      confidence,
      status,
    };
  }

  return result;
}

/**
 * Adjust a raw dimension score based on confidence level.
 * - none (0 fields): return 0 — don't score what you don't have
 * - low (<30%): blend toward a conservative baseline
 * - medium/high: trust the raw scorer
 */
export function adjustForConfidence(rawScore: number, conf: DimensionConfidence): number {
  if (conf.status === 'none') return 0;
  if (conf.status === 'low') {
    const baseline = 30;
    return Math.round(rawScore * conf.confidence + baseline * (1 - conf.confidence));
  }
  return rawScore;
}

// ── Data-source multipliers ───────────────────────────────────────────────────
// Stripe-verified data is trusted at face value.
// Document-backed data earns a small discount (manual errors possible).
// Self-reported only gets the largest discount — the core anti-gaming mechanism.
const SOURCE_MULTIPLIER: Record<DataSourceType, number> = {
  stripe:        1.00,
  document:      0.85,
  self_reported: 0.55,
};

// Which fields from DataSourceMap are most relevant per dimension
const DIMENSION_SOURCE_FIELDS: Record<string, Array<keyof DataSourceMap>> = {
  financial:  ['mrr', 'arr', 'monthlyBurn', 'runway', 'cogs'],
  traction:   ['mrr', 'conversationCount', 'customerCommitment'],
  market:     ['targetCustomers', 'lifetimeValue', 'conversionRate', 'costPerAcquisition'],
  goToMarket: ['conversationCount', 'customerCommitment'],
  // team + product are always self-reported (no external verification source)
};

/**
 * Apply a data-source multiplier to a dimension score.
 *
 * If no dataSourceMap is provided (pre-Stripe, legacy assessments), score is unchanged.
 * If some fields have explicit sources, we average the multipliers of known fields.
 * Fields without an explicit source are assumed self_reported.
 *
 * Only dimensions with financially verifiable fields get penalised.
 */
export function applySourceMultiplier(
  score: number,
  dimension: string,
  dataSourceMap?: DataSourceMap,
): number {
  if (!dataSourceMap) return score;

  const relevantFields = DIMENSION_SOURCE_FIELDS[dimension];
  if (!relevantFields || relevantFields.length === 0) return score;

  const multipliers = relevantFields.map(field => {
    const source = dataSourceMap[field] ?? 'self_reported';
    return SOURCE_MULTIPLIER[source];
  });

  const avgMultiplier = multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
  return Math.round(score * avgMultiplier);
}

/**
 * Summarise data sources for a given assessment — used in the UI
 * to show founders what would lift their score.
 */
export function summariseDataSources(
  dataSourceMap: DataSourceMap,
): {
  stripeFields: string[];
  documentFields: string[];
  selfReportedFields: string[];
  hasStripe: boolean;
} {
  const stripeFields: string[] = [];
  const documentFields: string[] = [];
  const selfReportedFields: string[] = [];

  for (const [field, source] of Object.entries(dataSourceMap)) {
    if (source === 'stripe') stripeFields.push(field);
    else if (source === 'document') documentFields.push(field);
    else selfReportedFields.push(field);
  }

  return { stripeFields, documentFields, selfReportedFields, hasStripe: stripeFields.length > 0 };
}
