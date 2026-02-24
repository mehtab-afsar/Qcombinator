/**
 * Confidence-Aware Scoring
 *
 * Calculates per-dimension confidence based on field coverage.
 * Adjusts raw scores to avoid misleading results from partial data.
 */

import { AssessmentData } from '../types/qscore.types';

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
