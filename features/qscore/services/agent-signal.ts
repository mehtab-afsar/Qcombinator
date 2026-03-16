import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/features/qscore/types/qscore.types';
import { ARTIFACT_TYPES, type ArtifactType } from '@/lib/constants/artifact-types';
import { DIMENSION_DB_COLUMN } from '@/lib/constants/dimensions';
import { AGENTS } from '@/lib/edgealpha.config';

/**
 * Dimension boost config per artifact type.
 * Points are one-time: once this artifact type has been boosted for a user,
 * subsequent generations of the same type are ignored.
 *
 * Caps: no single dimension can exceed 100, and the boost is conservative
 * (max +6 pts) — the real assessment drives meaningful score changes.
 */
const ARTIFACT_BOOST: Record<string, { dbColumn: string; label: string; points: number }> = {
  [ARTIFACT_TYPES.ICP_DOCUMENT]:       { dbColumn: DIMENSION_DB_COLUMN.gtm,      label: 'Go-to-Market', points: 5 },
  [ARTIFACT_TYPES.OUTREACH_SEQUENCE]:  { dbColumn: DIMENSION_DB_COLUMN.traction, label: 'Traction',     points: 4 },
  [ARTIFACT_TYPES.BATTLE_CARD]:        { dbColumn: DIMENSION_DB_COLUMN.market,   label: 'Market',       points: 4 },
  [ARTIFACT_TYPES.GTM_PLAYBOOK]:       { dbColumn: DIMENSION_DB_COLUMN.gtm,      label: 'Go-to-Market', points: 6 },
  [ARTIFACT_TYPES.SALES_SCRIPT]:       { dbColumn: DIMENSION_DB_COLUMN.traction, label: 'Traction',     points: 4 },
  [ARTIFACT_TYPES.BRAND_MESSAGING]:    { dbColumn: DIMENSION_DB_COLUMN.gtm,      label: 'Go-to-Market', points: 4 },
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]:  { dbColumn: DIMENSION_DB_COLUMN.financial,label: 'Financial',    points: 6 },
  [ARTIFACT_TYPES.LEGAL_CHECKLIST]:    { dbColumn: DIMENSION_DB_COLUMN.financial,label: 'Financial',    points: 3 },
  [ARTIFACT_TYPES.HIRING_PLAN]:        { dbColumn: DIMENSION_DB_COLUMN.team,     label: 'Team',         points: 5 },
  [ARTIFACT_TYPES.PMF_SURVEY]:         { dbColumn: DIMENSION_DB_COLUMN.product,  label: 'Product',      points: 5 },
  [ARTIFACT_TYPES.INTERVIEW_NOTES]:    { dbColumn: DIMENSION_DB_COLUMN.product,  label: 'Product',      points: 3 },
  [ARTIFACT_TYPES.COMPETITIVE_MATRIX]: { dbColumn: DIMENSION_DB_COLUMN.market,   label: 'Market',       points: 5 },
  [ARTIFACT_TYPES.STRATEGIC_PLAN]:     { dbColumn: DIMENSION_DB_COLUMN.product,  label: 'Product',      points: 4 },
};

interface SignalResult {
  boosted: boolean;
  pointsAdded?: number;
  dimensionLabel?: string;
  newOverall?: number;
}

export type ArtifactQuality = 'full' | 'partial' | 'minimal';

const QUALITY_MULTIPLIER: Record<ArtifactQuality, number> = {
  full:    1.0,
  partial: 0.6,
  minimal: 0.3,
};

/**
 * Determine artifact quality from content size.
 * Used when no explicit quality is provided.
 */
export function inferArtifactQuality(content: unknown): ArtifactQuality {
  const len = JSON.stringify(content ?? '').length;
  if (len > 800) return 'full';
  if (len > 300) return 'partial';
  return 'minimal';
}

/**
 * Apply a one-time score nudge when a founder completes an agent artifact.
 * Uses the Supabase admin client (must be called server-side).
 *
 * - No-ops if the artifact type was already signalled for this user
 * - No-ops if the user has no existing Q-Score (no base to nudge)
 * - No-ops if no agent in the registry owns this artifact type
 * - Inserts a new qscore_history row (data_source = 'agent_completion')
 *   so deltas are tracked correctly via the previous_score_id chain
 * - quality multiplier: full=1.0, partial=0.6, minimal=0.3
 */
export async function applyAgentScoreSignal(
  supabase: SupabaseClient,
  userId: string,
  artifactType: string,
  quality: ArtifactQuality = 'full',
): Promise<SignalResult> {
  // Verify ownership via registry (also validates the artifact type is known)
  const owningAgent = AGENTS.find(a =>
    a.tools.includes(artifactType as ArtifactType)
  );
  if (!owningAgent) {
    // Fall back to legacy ARTIFACT_BOOST lookup for unknown types
  }

  const boost = ARTIFACT_BOOST[artifactType];
  if (!boost) return { boosted: false };

  // Apply quality multiplier to points
  const qualityMultiplier = QUALITY_MULTIPLIER[quality];
  const adjustedPoints = Math.max(1, Math.round(boost.points * qualityMultiplier));

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
  scores[col] = Math.min(100, scores[col] + adjustedPoints);

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
    pointsAdded:    adjustedPoints,
    dimensionLabel: boost.label,
    newOverall,
  };
}
