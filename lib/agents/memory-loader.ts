import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgentMemory {
  session_count: number
  relationship_tier: string
  key_facts: string | null
}

export async function getAgentMemory(
  agentId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<AgentMemory | null> {
  const { data } = await supabase
    .from('agent_memory')
    .select('session_count, relationship_tier, key_facts')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single()
  return data as AgentMemory | null
}
