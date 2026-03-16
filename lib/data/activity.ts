/**
 * Agent activity data access layer.
 * Wraps agent_activity table.
 */

import { createClient } from '@/lib/supabase/server';

export interface ActivityEvent {
  id: string;
  user_id: string;
  agent_id: string;
  action_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const SELECT_FIELDS = 'id, user_id, agent_id, action_type, description, metadata, created_at';

export async function getActivity(
  userId: string,
  limit = 50,
): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_activity')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[data/activity] getActivity error:', error.message);
    return [];
  }
  return (data ?? []) as ActivityEvent[];
}

export async function logActivity(
  userId: string,
  agentId: string,
  actionType: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  void supabase.from('agent_activity').insert({
    user_id:     userId,
    agent_id:    agentId,
    action_type: actionType,
    description,
    metadata:    metadata ?? null,
  });
}
