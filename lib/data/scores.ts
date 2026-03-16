/**
 * Q-Score data access layer.
 * Wraps qscore_history table and qscore_with_delta view.
 */

import { createClient } from '@/lib/supabase/server';

export interface ScoreRow {
  id: string;
  user_id: string;
  overall_score: number;
  market_score: number;
  product_score: number;
  gtm_score: number;
  financial_score: number;
  team_score: number;
  traction_score: number;
  percentile: number | null;
  grade: string | null;
  data_source: string;
  assessment_id: string | null;
  previous_score_id: string | null;
  calculated_at: string;
}

const SCORE_FIELDS = 'id, user_id, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile, grade, data_source, assessment_id, previous_score_id, calculated_at';

export async function getLatestScore(userId: string): Promise<ScoreRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('qscore_history')
    .select(SCORE_FIELDS)
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as ScoreRow | null;
}

export async function getScoreHistory(
  userId: string,
  limit = 20,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('qscore_history')
    .select(SCORE_FIELDS)
    .eq('user_id', userId)
    .order('calculated_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[data/scores] getScoreHistory error:', error.message);
    return [];
  }
  return (data ?? []) as ScoreRow[];
}

export interface ScoreWithDelta extends ScoreRow {
  delta_overall: number;
  delta_market: number;
  delta_product: number;
  delta_gtm: number;
  delta_financial: number;
  delta_team: number;
  delta_traction: number;
}

/** Reads from the qscore_with_delta view if available, falls back to latest row. */
export async function getScoreWithDelta(userId: string): Promise<ScoreWithDelta | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('qscore_with_delta')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // View may not exist — fall back to latest score with zero deltas
    const latest = await getLatestScore(userId);
    if (!latest) return null;
    return {
      ...latest,
      delta_overall: 0,
      delta_market: 0,
      delta_product: 0,
      delta_gtm: 0,
      delta_financial: 0,
      delta_team: 0,
      delta_traction: 0,
    };
  }
  return data as ScoreWithDelta | null;
}

export async function saveScore(
  score: Omit<ScoreRow, 'id' | 'calculated_at'>,
): Promise<ScoreRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('qscore_history')
    .insert(score)
    .select(SCORE_FIELDS)
    .single();

  if (error) {
    console.error('[data/scores] saveScore error:', error.message);
    return null;
  }
  return data as ScoreRow | null;
}
