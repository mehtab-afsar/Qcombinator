/**
 * Artifact data access layer.
 * Wraps agent_artifacts table — all raw Supabase queries for artifacts go here.
 */

import { createClient } from '@/lib/supabase/server';
import type { ArtifactType } from '@/lib/constants/artifact-types';

export interface Artifact {
  id: string;
  user_id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  content: Record<string, unknown>;
  conversation_id: string | null;
  created_at: string;
}

const SELECT_FIELDS = 'id, user_id, agent_id, artifact_type, title, content, conversation_id, created_at';

export async function getArtifacts(
  userId: string,
  type?: ArtifactType,
): Promise<Artifact[]> {
  const supabase = await createClient();
  let q = supabase
    .from('agent_artifacts')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (type) q = q.eq('artifact_type', type);

  const { data, error } = await q;
  if (error) {
    console.error('[data/artifacts] getArtifacts error:', error.message);
    return [];
  }
  return (data ?? []) as Artifact[];
}

export async function getLatestArtifact(
  userId: string,
  type: ArtifactType,
): Promise<Artifact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_artifacts')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .eq('artifact_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as Artifact | null;
}

export async function getArtifactById(
  userId: string,
  artifactId: string,
): Promise<Artifact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_artifacts')
    .select(SELECT_FIELDS)
    .eq('id', artifactId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as Artifact | null;
}

export async function saveArtifact(
  artifact: Omit<Artifact, 'id' | 'created_at'>,
): Promise<Artifact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_artifacts')
    .insert(artifact)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error('[data/artifacts] saveArtifact error:', error.message);
    return null;
  }
  return data as Artifact | null;
}
