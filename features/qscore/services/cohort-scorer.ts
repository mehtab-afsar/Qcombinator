/**
 * Cohort Scorer
 *
 * Computes percentile-based dimension scores by comparing a founder's raw metric
 * values and dimension scores against everyone else on the platform.
 *
 * ACTIVATION RULE: Only kicks in when the cohort has >= MIN_COHORT_SIZE snapshots.
 * Below that threshold, returns null — callers fall back to DB tier scoring.
 *
 * This means:
 * - Day 1 (5 founders): tier scoring runs as normal
 * - Month 6 (50+ founders): cohort percentile scoring takes over automatically
 * - No code change, no config change, no admin needed
 *
 * How it works:
 * 1. After every Q-Score, a snapshot of raw metrics + dimension scores is saved
 * 2. On next score, load all snapshots for this sector (or all sectors if sector N is small)
 * 3. For each dimension: what % of founders scored lower than this founder? = percentile
 * 4. That percentile IS the dimension score (e.g. better than 73% of founders → 73)
 * 5. Re-weighted overall score uses these percentile dimension scores
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PRDQScore } from '../types/qscore.types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum cohort size before percentile scoring activates */
export const MIN_COHORT_SIZE = 100;

/** Minimum per-sector size before falling back to cross-sector cohort */
const MIN_SECTOR_SIZE = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricSnapshot {
  metrics: Record<string, number>;
  dimensionScores: Record<string, number>;
  overallScore: number;
  sector: string;
}

export interface CohortDimensionScores {
  market: number;
  product: number;
  goToMarket: number;
  financial: number;
  team: number;
  traction: number;
  overall: number;
  cohortSize: number;
  sector: string;
}

/** Raw metrics extracted from assessment data for snapshotting */
export interface ExtractedMetrics {
  // Market
  tam?: number;
  conversion_rate?: number;
  activity_rate?: number;
  ltv_cac_ratio?: number;
  // Financial
  gross_margin_pct?: number;
  arr?: number;
  runway_months?: number;
  projected_growth_pct?: number;
  // GTM
  channels_tried?: number;
  channel_results?: number;
  cac_ratio?: number;
  // Traction + Product + Team (shared)
  conversation_count?: number;
  build_time_days?: number;
}

// ─── Snapshot Persistence ─────────────────────────────────────────────────────

/**
 * Save a metric snapshot after Q-Score calculation.
 * Call fire-and-forget (void) — never blocks the scoring response.
 */
export async function saveMetricSnapshot(
  supabase: SupabaseClient,
  userId: string,
  qscoreHistoryId: string | null,
  sector: string,
  metrics: ExtractedMetrics,
  dimensionScores: Record<string, number>,
  overallScore: number
): Promise<void> {
  try {
    await supabase.from('founder_metric_snapshots').insert({
      user_id: userId,
      qscore_history_id: qscoreHistoryId,
      sector,
      metrics,
      dimension_scores: dimensionScores,
      overall_score: overallScore,
    });
  } catch (err) {
    // Never throw — this is instrumentation, not scoring
    console.warn('[CohortScorer] Failed to save snapshot:', err);
  }
}

// ─── Metric Extractor ─────────────────────────────────────────────────────────

/**
 * Extracts numeric metric values from assessment data for snapshotting.
 * Mirrors the same calculations the dimension calculators use.
 */
export function extractMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): ExtractedMetrics {
  const metrics: ExtractedMetrics = {};

  // TAM = targetCustomers × lifetimeValue
  const tc = Number(data.targetCustomers) || 0;
  const ltv = Number(data.lifetimeValue) || 0;
  if (tc > 0 && ltv > 0) metrics.tam = tc * ltv;

  // Conversion rate (direct field, percentage)
  if (data.conversionRate != null) metrics.conversion_rate = Number(data.conversionRate) || 0;

  // Activity rate = (dailyActivity / targetCustomers) × 100
  const da = Number(data.dailyActivity) || 0;
  if (da > 0 && tc > 0) metrics.activity_rate = (da / tc) * 100;

  // LTV:CAC ratio
  const cac = Number(data.costPerAcquisition) || 0;
  if (ltv > 0 && cac > 0) metrics.ltv_cac_ratio = ltv / cac;

  // Financial — read from nested financial object
  const fin = data.financial ?? {};
  const rev = Number(fin.arr) || (Number(fin.mrr) * 12) || 0;
  if (rev > 0) metrics.arr = rev;

  const avgDeal = Number(fin.averageDealSize) || 0;
  const cogs = Number(fin.cogs) || 0;
  if (avgDeal > 0) metrics.gross_margin_pct = ((avgDeal - cogs) / avgDeal) * 100;

  if (fin.runway != null) metrics.runway_months = Number(fin.runway) || 0;

  const proj = Number(fin.projectedRevenue12mo) || 0;
  if (proj > 0 && rev > 0) metrics.projected_growth_pct = ((proj - rev) / rev) * 100;

  // GTM
  const gtm = data.gtm ?? {};
  if (Array.isArray(gtm.channelsTried)) metrics.channels_tried = gtm.channelsTried.length;
  if (Array.isArray(gtm.channelResults)) metrics.channel_results = gtm.channelResults.length;
  const currentCac = Number(gtm.currentCAC) || 0;
  const targetCac = Number(gtm.targetCAC) || 0;
  if (currentCac > 0 && targetCac > 0) metrics.cac_ratio = currentCac / targetCac;

  // Traction / Product / Team (shared fields)
  if (data.conversationCount != null) metrics.conversation_count = Number(data.conversationCount) || 0;
  if (data.buildTime != null) metrics.build_time_days = Number(data.buildTime) || 0;

  return metrics;
}

// ─── Cohort Loader ────────────────────────────────────────────────────────────

/**
 * Load cohort snapshots from DB.
 * Tries sector-specific first (>= MIN_SECTOR_SIZE), falls back to all sectors.
 * Returns null if total cohort is still too small.
 */
async function loadCohortSnapshots(
  supabase: SupabaseClient,
  sector: string,
  excludeUserId: string
): Promise<MetricSnapshot[] | null> {
  // Try sector-specific cohort first
  const { data: sectorData } = await supabase
    .from('founder_metric_snapshots')
    .select('metrics, dimension_scores, overall_score, sector')
    .eq('sector', sector)
    .neq('user_id', excludeUserId)
    .order('calculated_at', { ascending: false });

  if (sectorData && sectorData.length >= MIN_SECTOR_SIZE) {
    return sectorData.map(r => ({
      metrics: r.metrics ?? {},
      dimensionScores: r.dimension_scores ?? {},
      overallScore: r.overall_score ?? 0,
      sector: r.sector,
    }));
  }

  // Fall back to cross-sector cohort
  const { data: allData } = await supabase
    .from('founder_metric_snapshots')
    .select('metrics, dimension_scores, overall_score, sector')
    .neq('user_id', excludeUserId)
    .order('calculated_at', { ascending: false });

  if (!allData || allData.length < MIN_COHORT_SIZE) return null;

  return allData.map(r => ({
    metrics: r.metrics ?? {},
    dimensionScores: r.dimension_scores ?? {},
    overallScore: r.overall_score ?? 0,
    sector: r.sector,
  }));
}

// ─── Core Percentile Math ─────────────────────────────────────────────────────

/**
 * Given a value and a sorted array of all cohort values for the same metric,
 * returns what percentile rank this value occupies (0–100).
 *
 * Uses "strict less than" percentile — % of cohort scoring BELOW this founder.
 * Ties don't inflate the score (same value = same percentile).
 */
function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const below = allValues.filter(v => v < value).length;
  return Math.round((below / allValues.length) * 100);
}

// ─── Main Cohort Scorer ───────────────────────────────────────────────────────

/**
 * Compute cohort-based dimension scores for a founder.
 *
 * Returns null when:
 * - Cohort is too small (< MIN_COHORT_SIZE)
 * - DB unavailable
 *
 * When non-null, each dimension score is the founder's percentile rank
 * among their cohort for that dimension (0–100).
 *
 * The overall score is the weighted average of those percentile scores,
 * using the same dimension weights already applied in calculatePRDQScore().
 */
export async function computeCohortScores(
  supabase: SupabaseClient,
  userId: string,
  sector: string,
  thisDimensionScores: PRDQScore['breakdown']
): Promise<CohortDimensionScores | null> {
  try {
    const cohort = await loadCohortSnapshots(supabase, sector, userId);
    if (!cohort) return null;

    const dimensions = ['market', 'product', 'goToMarket', 'financial', 'team', 'traction'] as const;

    // For each dimension, gather all cohort scores and compute this founder's percentile
    const percentiles: Record<string, number> = {};
    for (const dim of dimensions) {
      const cohortValues = cohort
        .map(s => s.dimensionScores[dim])
        .filter((v): v is number => typeof v === 'number' && isFinite(v));

      if (cohortValues.length < MIN_COHORT_SIZE) {
        // Not enough data for this specific dimension — use this founder's raw score
        percentiles[dim] = thisDimensionScores[dim].score;
      } else {
        percentiles[dim] = percentileRank(thisDimensionScores[dim].score, cohortValues);
      }
    }

    // Overall = weighted average of percentile dimension scores
    // Reuse the same weights already embedded in the breakdown
    const weights = {
      market:     thisDimensionScores.market.weight,
      product:    thisDimensionScores.product.weight,
      goToMarket: thisDimensionScores.goToMarket.weight,
      financial:  thisDimensionScores.financial.weight,
      team:       thisDimensionScores.team.weight,
      traction:   thisDimensionScores.traction.weight,
    };

    const overall = Math.round(
      dimensions.reduce((sum, dim) => sum + percentiles[dim] * weights[dim], 0)
    );

    return {
      market:     percentiles.market,
      product:    percentiles.product,
      goToMarket: percentiles.goToMarket,
      financial:  percentiles.financial,
      team:       percentiles.team,
      traction:   percentiles.traction,
      overall:    Math.max(0, Math.min(100, overall)),
      cohortSize: cohort.length,
      sector,
    };
  } catch (err) {
    console.warn('[CohortScorer] computeCohortScores failed, skipping:', err);
    return null;
  }
}

/**
 * Compute percentile for a single raw metric value.
 * Useful for surfacing per-metric benchmarks in the UI
 * (e.g. "Your ARR is better than 67% of founders").
 */
export async function computeMetricPercentile(
  supabase: SupabaseClient,
  userId: string,
  sector: string,
  metricKey: keyof ExtractedMetrics,
  value: number
): Promise<{ percentile: number; cohortSize: number } | null> {
  try {
    const cohort = await loadCohortSnapshots(supabase, sector, userId);
    if (!cohort) return null;

    const values = cohort
      .map(s => s.metrics[metricKey])
      .filter((v): v is number => typeof v === 'number' && isFinite(v) && v > 0);

    if (values.length < MIN_COHORT_SIZE) return null;

    return {
      percentile: percentileRank(value, values),
      cohortSize: values.length,
    };
  } catch {
    return null;
  }
}
