/**
 * Indicator Scorer
 *
 * Given a raw numeric value and an IQIndicatorConfig (from DB),
 * returns a score 1–5 using the config thresholds.
 *
 * No hardcoded numbers here — all thresholds come from iq_indicators table.
 * Changing a threshold = UPDATE in DB, no code deploy needed.
 */

import { IQIndicatorConfig } from '../types/iq.types';
import { SupabaseClient } from '@supabase/supabase-js';

// ─── In-memory config cache (1 hour TTL) ─────────────────────────────────────

let configCache: IQIndicatorConfig[] | null = null;
let configCachedAt = 0;
const CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchIndicatorConfig(supabase: SupabaseClient): Promise<IQIndicatorConfig[]> {
  const now = Date.now();
  if (configCache && now - configCachedAt < CONFIG_TTL_MS) {
    return configCache;
  }

  const { data, error } = await supabase
    .from('iq_indicators')
    .select('*')
    .eq('is_active', true)
    .order('parameter_id')
    .order('code');

  if (error || !data) {
    console.warn('[IQ] Failed to fetch indicator config:', error?.message);
    return configCache ?? []; // return stale cache on error
  }

  configCache = data.map(row => ({
    id: row.id,
    code: row.code,
    parameterId: row.parameter_id,
    name: row.name,
    description: row.description,
    dataField: row.data_field,
    score1Max: row.score_1_max,
    score3Max: row.score_3_max,
    score5Min: row.score_5_min,
    higherIsBetter: row.higher_is_better,
    aiReconciled: row.ai_reconciled,
    isActive: row.is_active,
    unit: row.unit ?? '',
    benchmarkSource: row.benchmark_source,
    notes: row.notes,
  }));
  configCachedAt = now;
  return configCache;
}

/** Invalidate config cache (call after admin updates a threshold) */
export function invalidateConfigCache(): void {
  configCache = null;
  configCachedAt = 0;
}

// ─── Core Scoring ─────────────────────────────────────────────────────────────

/**
 * Score a numeric value 1–5 using DB-driven thresholds.
 *
 * Interpolates linearly between tier boundaries for smooth scoring.
 * Handles higher_is_better=false (e.g. customer concentration).
 *
 * Returns null if value is null/undefined/non-finite.
 */
export function scoreValue(
  value: number | null,
  config: IQIndicatorConfig
): number | null {
  if (value == null || !isFinite(value)) return null;

  const { score1Max, score3Max, score5Min, higherIsBetter } = config;

  // If all thresholds are null, return a neutral score
  if (score1Max == null && score3Max == null && score5Min == null) return 3;

  // Invert value for "lower is better" indicators (e.g. customer concentration)
  // so the same scoring logic applies uniformly
  const v = higherIsBetter ? value : -value;
  const s1 = score1Max != null ? (higherIsBetter ? score1Max : -score1Max) : null;
  const s3 = score3Max != null ? (higherIsBetter ? score3Max : -score3Max) : null;
  const s5 = score5Min != null ? (higherIsBetter ? score5Min : -score5Min) : null;

  // Score 5: at or above the top threshold
  if (s5 != null && v >= s5) return 5;

  // Score 1: at or below the bottom threshold
  if (s1 != null && v <= s1) return 1;

  // Score 3: at or below the mid threshold
  if (s3 != null && v <= s3) {
    if (s1 != null && s3 > s1) {
      // Interpolate between 1 and 3
      const t = (v - s1) / (s3 - s1);
      return 1 + t * 2; // 1.0 → 3.0
    }
    return 3;
  }

  // Between s3 and s5
  if (s3 != null && s5 != null && s5 > s3) {
    const t = (v - s3) / (s5 - s3);
    return 3 + t * 2; // 3.0 → 5.0
  }

  // Fallback: between s1 and s5 with no s3
  if (s1 != null && s5 != null && s5 > s1) {
    const t = Math.max(0, Math.min(1, (v - s1) / (s5 - s1)));
    return 1 + t * 4; // 1.0 → 5.0
  }

  return 3; // neutral fallback
}

/**
 * Round an interpolated score to one decimal place, clamped 1–5.
 */
export function finalizeScore(raw: number | null): number | null {
  if (raw == null) return null;
  return Math.round(Math.max(1, Math.min(5, raw)) * 10) / 10;
}
