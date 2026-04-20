/**
 * Q-Score Threshold Config
 *
 * Fetches scoring tiers and dimension weights from DB with 1-hour cache.
 * Dimension calculators call scoreTiers() instead of hardcoded if/else chains.
 *
 * Fallback: if DB unavailable, callers should fall back to their own hardcoded values.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QScoreTier {
  tierRank: number;
  minValue: number | null;
  maxValue: number | null;
  points: number;
  maxPoints: number;
  label: string;
}

/** Keyed as `${dimension}.${metric}` → sorted tiers */
export type ThresholdMap = Map<string, QScoreTier[]>;

export type DimensionWeightMap = Map<string, number>; // dimension → weight

// ─── Cache ────────────────────────────────────────────────────────────────────

let thresholdCache: ThresholdMap | null = null;
let thresholdCachedAt = 0;

let weightCache: Map<string, DimensionWeightMap> | null = null;
let weightCachedAt = 0;

const TTL_MS = 60 * 60 * 1000; // 1 hour

export function invalidateQScoreThresholdCache(): void {
  thresholdCache = null;
  thresholdCachedAt = 0;
  weightCache = null;
  weightCachedAt = 0;
}

// ─── Threshold Loader ─────────────────────────────────────────────────────────

export async function fetchQScoreThresholds(supabase: SupabaseClient): Promise<ThresholdMap> {
  const now = Date.now();
  if (thresholdCache && now - thresholdCachedAt < TTL_MS) return thresholdCache;

  const { data, error } = await supabase
    .from('qscore_thresholds')
    .select('dimension, metric, tier_rank, min_value, max_value, points, max_points, label')
    .eq('is_active', true)
    .order('dimension')
    .order('metric')
    .order('tier_rank');

  if (error || !data) {
    log.warn('[Q-Score Thresholds] Failed to fetch:', error?.message);
    return thresholdCache ?? new Map(); // return stale cache or empty on failure
  }

  const map: ThresholdMap = new Map();
  for (const row of data as Array<{
    dimension: string; metric: string; tier_rank: number;
    min_value: number | null; max_value: number | null;
    points: number; max_points: number; label: string;
  }>) {
    const key = `${row.dimension}.${row.metric}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push({
      tierRank: row.tier_rank,
      minValue: row.min_value,
      maxValue: row.max_value,
      points: row.points,
      maxPoints: row.max_points,
      label: row.label,
    });
  }

  thresholdCache = map;
  thresholdCachedAt = now;
  return map;
}

// ─── Weight Loader ────────────────────────────────────────────────────────────

export async function fetchDimensionWeights(
  supabase: SupabaseClient,
  sector: string
): Promise<DimensionWeightMap> {
  const now = Date.now();
  if (weightCache && now - weightCachedAt < TTL_MS) {
    return weightCache.get(sector) ?? weightCache.get('default') ?? defaultWeights();
  }

  const { data, error } = await supabase
    .from('qscore_dimension_weights')
    .select('sector, dimension, weight');

  if (error || !data) {
    log.warn('[Q-Score Weights] Failed to fetch:', error?.message);
    return defaultWeights();
  }

  weightCache = new Map();
  for (const row of data as Array<{ sector: string; dimension: string; weight: number }>) {
    if (!weightCache.has(row.sector)) weightCache.set(row.sector, new Map());
    weightCache.get(row.sector)?.set(row.dimension, row.weight);
  }
  weightCachedAt = now;

  return weightCache.get(sector) ?? weightCache.get('default') ?? defaultWeights();
}

function defaultWeights(): DimensionWeightMap {
  return new Map([
    ['market', 0.20],
    ['product', 0.18],
    ['goToMarket', 0.17],
    ['financial', 0.18],
    ['team', 0.15],
    ['traction', 0.12],
  ]);
}

// ─── Core Tier Scorer ─────────────────────────────────────────────────────────

/**
 * Score a numeric value against a list of tiers.
 * Tiers are evaluated in tierRank order (1 first = highest priority).
 * Returns points from the first matching tier.
 * A tier with minValue=null and maxValue=null is a catch-all.
 */
export function scoreTiers(value: number, tiers: QScoreTier[]): number {
  if (!tiers || tiers.length === 0) return 0;

  const sorted = [...tiers].sort((a, b) => a.tierRank - b.tierRank);

  for (const tier of sorted) {
    const aboveMin = tier.minValue === null || value >= tier.minValue;
    const belowMax = tier.maxValue === null || value <= tier.maxValue;
    if (aboveMin && belowMax) return tier.points;
  }

  return 0;
}

/**
 * Get tiers for a specific dimension.metric key.
 * Returns null if not found — callers should fall back to hardcoded logic.
 */
export function getTiers(
  thresholds: ThresholdMap,
  dimension: string,
  metric: string
): QScoreTier[] | null {
  return thresholds.get(`${dimension}.${metric}`) ?? null;
}
