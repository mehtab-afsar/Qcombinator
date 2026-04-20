/**
 * Momentum Score
 *
 * Measures how fast a founder is improving their Q-Score.
 * Calculated as: delta between latest score and score 30 days ago,
 * normalised against same-stage cohort so comparison is fair.
 *
 * Rules:
 * - If no score 30 days ago: use the oldest score on record as baseline
 * - Minimum 2 scores to produce momentum (single score = null)
 * - Cohort normalisation: percentile rank of delta within same stage
 * - Stored on founder_profiles.momentum_score as a signed integer (-100 to +100)
 *
 * Hot:     momentum >= +10
 * Rising:  momentum >= +4
 * Steady:  momentum >= -3
 * Falling: momentum < -3
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger'

export type MomentumLabel = 'hot' | 'rising' | 'steady' | 'falling';

export function momentumLabel(score: number | null): MomentumLabel {
  if (score === null) return 'steady';
  if (score >= 10) return 'hot';
  if (score >= 4)  return 'rising';
  if (score >= -3) return 'steady';
  return 'falling';
}

export function momentumColor(label: MomentumLabel): string {
  if (label === 'hot')     return '#DC2626';
  if (label === 'rising')  return '#16A34A';
  if (label === 'steady')  return '#8A867C';
  return '#D97706';
}

/** Calculate raw 30-day delta for a single user from qscore_history rows */
export function calculateRawDelta(
  scores: Array<{ overall_score: number; calculated_at: string }>
): number | null {
  if (scores.length < 2) return null;

  // Sort descending by date
  const sorted = [...scores].sort(
    (a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
  );

  const latest = sorted[0];
  const thirtyDaysAgo = new Date(latest.calculated_at);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find the closest score to 30 days ago (but not newer than that)
  const baseline = sorted.find(
    s => new Date(s.calculated_at) <= thirtyDaysAgo
  ) ?? sorted[sorted.length - 1]; // fallback: oldest

  if (baseline === latest) return null; // only one score
  return latest.overall_score - baseline.overall_score;
}

/**
 * Recompute and persist momentum for a single user.
 * Called fire-and-forget from qscore/calculate after every scoring event.
 */
export async function updateMomentum(
  supabase: SupabaseClient,
  userId: string,
  stage: string | null
): Promise<number | null> {
  try {
    // Fetch this user's recent scores
    const { data: myScores } = await supabase
      .from('qscore_history')
      .select('overall_score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(20);

    if (!myScores || myScores.length < 2) {
      // First-time user — write 0 (steady) so the column is populated
      await supabase
        .from('founder_profiles')
        .update({ momentum_score: 0, momentum_updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return 0;
    }

    const rawDelta = calculateRawDelta(myScores as Array<{ overall_score: number; calculated_at: string }>);
    if (rawDelta === null) {
      await supabase
        .from('founder_profiles')
        .update({ momentum_score: 0, momentum_updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return 0;
    }

    // Fetch same-stage cohort deltas for normalisation
    const stageFilter = stage ?? 'unknown';
    const { data: cohortProfiles } = await supabase
      .from('founder_profiles')
      .select('user_id')
      .eq('stage', stageFilter)
      .neq('user_id', userId)
      .limit(200);

    const cohortIds = (cohortProfiles ?? []).map((p: { user_id: string }) => p.user_id);

    let momentumScore = rawDelta; // default: raw delta when cohort too small

    if (cohortIds.length >= 10) {
      const { data: cohortScores } = await supabase
        .from('qscore_history')
        .select('user_id, overall_score, calculated_at')
        .in('user_id', cohortIds)
        .order('calculated_at', { ascending: false });

      // Group by user
      const byUser = new Map<string, Array<{ overall_score: number; calculated_at: string }>>();
      for (const row of (cohortScores ?? []) as Array<{ user_id: string; overall_score: number; calculated_at: string }>) {
        if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
        byUser.get(row.user_id)?.push(row);
      }

      const cohortDeltas = Array.from(byUser.values())
        .map(calculateRawDelta)
        .filter((d): d is number => d !== null);

      if (cohortDeltas.length >= 5) {
        // Percentile rank among cohort deltas, scaled to -50..+50
        const below = cohortDeltas.filter(d => d < rawDelta).length;
        const pct = (below / cohortDeltas.length) * 100; // 0-100
        // Map: 0th percentile = -50, 50th = 0, 100th = +50
        // Then add raw delta contribution (capped at ±5)
        momentumScore = Math.round((pct - 50) + Math.max(-5, Math.min(5, rawDelta)));
      }
    }

    const clampedMomentum = Math.max(-100, Math.min(100, Math.round(momentumScore)));

    await supabase
      .from('founder_profiles')
      .update({
        momentum_score: clampedMomentum,
        momentum_updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return clampedMomentum;
  } catch (err) {
    log.warn('[Momentum] Update failed:', err);
    return null;
  }
}
