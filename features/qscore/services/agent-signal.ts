import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateGrade } from '@/features/qscore/types/qscore.types';
import { ARTIFACT_TYPES, type ArtifactType } from '@/lib/constants/artifact-types';
import { AGENTS } from '@/lib/edgealpha.config';
import { fetchDimensionWeights } from '@/features/qscore/services/threshold-config';
import { log } from '@/lib/logger'

/**
 * P1-P6 boost config per artifact type.
 * Points are one-time: once this artifact type has been boosted for a user,
 * subsequent generations of the same type are ignored.
 *
 * Caps: no single parameter can exceed 100, and the boost is conservative
 * (max +6 pts) — the real assessment drives meaningful score changes.
 */
export const ARTIFACT_BOOST: Record<string, { dbColumn: string; label: string; paramId: string; points: number }> = {
  [ARTIFACT_TYPES.ICP_DOCUMENT]:       { dbColumn: 'p2_score', label: 'P2: Market Potential',   paramId: 'p2', points: 5 },
  [ARTIFACT_TYPES.OUTREACH_SEQUENCE]:  { dbColumn: 'p1_score', label: 'P1: Market Readiness',   paramId: 'p1', points: 3 },
  [ARTIFACT_TYPES.BATTLE_CARD]:        { dbColumn: 'p2_score', label: 'P2: Market Potential',   paramId: 'p2', points: 4 },
  [ARTIFACT_TYPES.GTM_PLAYBOOK]:       { dbColumn: 'p1_score', label: 'P1: Market Readiness',   paramId: 'p1', points: 6 },
  [ARTIFACT_TYPES.SALES_SCRIPT]:       { dbColumn: 'p1_score', label: 'P1: Market Readiness',   paramId: 'p1', points: 4 },
  [ARTIFACT_TYPES.BRAND_MESSAGING]:    { dbColumn: 'p2_score', label: 'P2: Market Potential',   paramId: 'p2', points: 3 },
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]:  { dbColumn: 'p6_score', label: 'P6: Financials',         paramId: 'p6', points: 6 },
  [ARTIFACT_TYPES.LEGAL_CHECKLIST]:    { dbColumn: 'p3_score', label: 'P3: IP & Defensibility', paramId: 'p3', points: 3 },
  [ARTIFACT_TYPES.HIRING_PLAN]:        { dbColumn: 'p4_score', label: 'P4: Founder & Team',     paramId: 'p4', points: 5 },
  [ARTIFACT_TYPES.PMF_SURVEY]:         { dbColumn: 'p1_score', label: 'P1: Market Readiness',   paramId: 'p1', points: 5 },
  [ARTIFACT_TYPES.INTERVIEW_NOTES]:    { dbColumn: 'p1_score', label: 'P1: Market Readiness',   paramId: 'p1', points: 3 },
  [ARTIFACT_TYPES.COMPETITIVE_MATRIX]: { dbColumn: 'p2_score', label: 'P2: Market Potential',   paramId: 'p2', points: 5 },
  [ARTIFACT_TYPES.STRATEGIC_PLAN]:     { dbColumn: 'p2_score', label: 'P2: Market Potential',   paramId: 'p2', points: 4 },
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

  // Fast-path idempotency check — the DB also enforces this via a partial unique
  // index on (user_id, source_artifact_type) so concurrent requests can't both
  // slip through this SELECT before either INSERT lands.
  const { data: existing } = await supabase
    .from('qscore_history')
    .select('id')
    .eq('user_id', userId)
    .eq('source_artifact_type', artifactType)
    .limit(1)
    .maybeSingle();

  if (existing) return { boosted: false }; // Already applied — idempotent

  // Fetch latest score row
  const { data: latest } = await supabase
    .from('qscore_history')
    .select('id, assessment_id, overall_score, percentile, grade, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (!latest) return { boosted: false }; // No base score to nudge

  // Apply parameter boost (cap at 100)
  const scores = {
    p1_score: latest.p1_score ?? 0,
    p2_score: latest.p2_score ?? 0,
    p3_score: latest.p3_score ?? 0,
    p4_score: latest.p4_score ?? 0,
    p5_score: latest.p5_score ?? 0,
    p6_score: latest.p6_score ?? 0,
  };

  const col = boost.dbColumn as keyof typeof scores;
  scores[col] = Math.min(100, scores[col] + adjustedPoints);

  // Fetch sector-specific weights so Biotech/Fintech/etc. get the right overall delta
  const { data: fp } = await supabase
    .from('founder_profiles')
    .select('industry')
    .eq('user_id', userId)
    .single();
  const sector = fp?.industry ?? 'default';
  const dimWeights = await fetchDimensionWeights(supabase, sector);

  const w = {
    p1: dimWeights.get('p1') ?? dimWeights.get('market')     ?? 0.20,
    p2: dimWeights.get('p2') ?? dimWeights.get('goToMarket') ?? 0.17,
    p3: dimWeights.get('p3') ?? dimWeights.get('product')    ?? 0.18,
    p4: dimWeights.get('p4') ?? dimWeights.get('team')       ?? 0.15,
    p5: dimWeights.get('p5') ?? dimWeights.get('traction')   ?? 0.12,
    p6: dimWeights.get('p6') ?? dimWeights.get('financial')  ?? 0.18,
  };

  // Recalculate weighted overall using founder's sector weights
  const newOverall = Math.min(100, Math.round(
    scores.p1_score * w.p1 +
    scores.p2_score * w.p2 +
    scores.p3_score * w.p3 +
    scores.p4_score * w.p4 +
    scores.p5_score * w.p5 +
    scores.p6_score * w.p6,
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
      score_version:        'v2_q',
      ...scores,
    });

  if (error) {
    // code 23505 = unique_violation — a concurrent request already inserted this
    // artifact's boost row. Treat as idempotent success (user was already boosted).
    if (error.code === '23505') return { boosted: false };
    log.error('applyAgentScoreSignal insert error:', error);
    return { boosted: false };
  }

  // Fire milestone notification if the score crossed a round-number threshold
  const MILESTONES = [50, 60, 70, 75, 80]
  const prevOverall = latest.overall_score
  const crossed = MILESTONES.find(m => prevOverall < m && newOverall >= m)
  if (crossed) {
    void supabase.from('notifications').insert({
      user_id: userId,
      type:    'qscore_update',
      title:   `Q-Score milestone: ${crossed}`,
      message: `Your Q-Score reached ${crossed}! Investors filtering above ${crossed} can now see your profile.`,
      metadata: { newScore: newOverall, milestone: crossed, previous: prevOverall },
    }).then()
  }

  return {
    boosted:        true,
    pointsAdded:    adjustedPoints,
    dimensionLabel: boost.label,
    newOverall,
  };
}
