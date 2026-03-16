/**
 * Score evidence data access layer.
 * Wraps score_evidence table.
 */

import { createClient } from '@/lib/supabase/server';
import type { Dimension } from '@/lib/constants/dimensions';

export interface Evidence {
  id: string;
  user_id: string;
  dimension: Dimension;
  evidence_type: string;
  title: string;
  description: string | null;
  data_value: string;
  status: 'pending' | 'verified' | 'rejected';
  points_awarded: number;
  reviewed_at: string | null;
  created_at: string;
}

const SELECT_FIELDS = 'id, user_id, dimension, evidence_type, title, description, data_value, status, points_awarded, reviewed_at, created_at';

export async function getEvidence(
  userId: string,
  dimension?: Dimension,
): Promise<Evidence[]> {
  const supabase = await createClient();
  let q = supabase
    .from('score_evidence')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (dimension) q = q.eq('dimension', dimension);

  const { data, error } = await q;
  if (error) {
    console.error('[data/evidence] getEvidence error:', error.message);
    return [];
  }
  return (data ?? []) as Evidence[];
}

export async function saveEvidence(
  evidence: Omit<Evidence, 'id' | 'created_at' | 'reviewed_at'>,
): Promise<Evidence | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('score_evidence')
    .insert(evidence)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error('[data/evidence] saveEvidence error:', error.message);
    return null;
  }
  return data as Evidence | null;
}
