import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/features/qscore/types/qscore.types';

/**
 * Dimension boost config per artifact type.
 * Points are one-time: once this artifact type has been boosted for a user,
 * subsequent generations of the same type are ignored.
 *
 * Caps: no single dimension can exceed 100, and the boost is conservative
 * (max +6 pts) — the real assessment drives meaningful score changes.
 */
const ARTIFACT_BOOST: Record<string, { dbColumn: string; label: string; points: number }> = {
  icp_document:       { dbColumn: 'gtm_score',       label: 'Go-to-Market', points: 5 },
  outreach_sequence:  { dbColumn: 'traction_score',  label: 'Traction',     points: 4 },
  battle_card:        { dbColumn: 'market_score',    label: 'Market',       points: 4 },
  gtm_playbook:       { dbColumn: 'gtm_score',       label: 'Go-to-Market', points: 6 },
  sales_script:       { dbColumn: 'traction_score',  label: 'Traction',     points: 4 },
  brand_messaging:    { dbColumn: 'gtm_score',       label: 'Go-to-Market', points: 4 },
  financial_summary:  { dbColumn: 'financial_score', label: 'Financial',    points: 6 },
  legal_checklist:    { dbColumn: 'financial_score', label: 'Financial',    points: 3 },
  hiring_plan:        { dbColumn: 'team_score',      label: 'Team',         points: 5 },
  pmf_survey:         { dbColumn: 'product_score',   label: 'Product',      points: 5 },
  competitive_matrix: { dbColumn: 'market_score',    label: 'Market',       points: 5 },
  strategic_plan:     { dbColumn: 'product_score',   label: 'Product',      points: 4 },
};

interface SignalResult {
  boosted: boolean;
  pointsAdded?: number;
  dimensionLabel?: string;
  newOverall?: number;
}

/**
 * Apply a one-time score nudge when a founder completes an agent artifact.
 * Uses the Supabase admin client (must be called server-side).
 *
 * - No-ops if the artifact type was already signalled for this user
 * - No-ops if the user has no existing Q-Score (no base to nudge)
 * - Inserts a new qscore_history row (data_source = 'agent_completion')
 *   so deltas are tracked correctly via the previous_score_id chain
 */
export async function applyAgentScoreSignal(
  supabase: SupabaseClient,
  userId: string,
  artifactType: string,
): Promise<SignalResult> {
  const boost = ARTIFACT_BOOST[artifactType];
  if (!boost) return { boosted: false };

  // Check for existing boost of this artifact type for this user
  const { data: existing } = await supabase
    .from('qscore_history')
    .select('id')
    .eq('user_id', userId)
    .eq('source_artifact_type', artifactType)
    .limit(1)
    .single();

  if (existing) return { boosted: false }; // Already applied — idempotent

  // Fetch latest score row
  const { data: latest } = await supabase
    .from('qscore_history')
    .select('id, assessment_id, overall_score, percentile, grade, market_score, product_score, gtm_score, financial_score, team_score, traction_score')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (!latest) return { boosted: false }; // No base score to nudge

  // Apply dimension boost (cap at 100)
  const scores = {
    market_score:    latest.market_score    ?? 0,
    product_score:   latest.product_score   ?? 0,
    gtm_score:       latest.gtm_score       ?? 0,
    financial_score: latest.financial_score ?? 0,
    team_score:      latest.team_score      ?? 0,
    traction_score:  latest.traction_score  ?? 0,
  };

  const col = boost.dbColumn as keyof typeof scores;
  scores[col] = Math.min(100, scores[col] + boost.points);

  // Recalculate weighted overall (weights match prd-aligned-qscore.ts)
  const newOverall = Math.min(100, Math.round(
    scores.market_score    * 0.20 +
    scores.product_score   * 0.18 +
    scores.gtm_score       * 0.17 +
    scores.financial_score * 0.18 +
    scores.team_score      * 0.15 +
    scores.traction_score  * 0.12,
  ));

  // Insert new history row (linked via previous_score_id for delta tracking)
  const { error } = await supabase
    .from('qscore_history')
    .insert({
      user_id:              userId,
      assessment_id:        latest.assessment_id ?? null,
      previous_score_id:    latest.id,
      overall_score:        newOverall,
      percentile:           latest.percentile,   // Kept from last real assessment
      grade:                calculateGrade(newOverall),
      data_source:          'agent_completion',
      source_artifact_type: artifactType,
      ...scores,
    });

  if (error) {
    console.error('applyAgentScoreSignal insert error:', error);
    return { boosted: false };
  }

  return {
    boosted:        true,
    pointsAdded:    boost.points,
    dimensionLabel: boost.label,
    newOverall,
  };
}
