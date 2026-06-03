import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgentMemory {
  session_count:          number
  relationship_tier:      string
  key_facts:              string | null  // general prose summary (legacy + current)
  confirmed_facts:        string | null  // explicitly stated facts
  open_threads:           string | null  // agreed next steps / open questions
  founder_prefs:          string | null  // communication style preferences
  hypotheses:             string | null  // agent inferences
  patel_asked_questions:  string | null  // pipe-separated list of Patel questions asked
}

export async function getAgentMemory(
  agentId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<AgentMemory | null> {
  const { data } = await supabase
    .from('agent_memory')
    .select('session_count, relationship_tier, key_facts, confirmed_facts, open_threads, founder_prefs, hypotheses, patel_asked_questions')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single()
  return data as AgentMemory | null
}
