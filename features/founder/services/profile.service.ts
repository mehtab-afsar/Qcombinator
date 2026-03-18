/**
 * Profile Service — fetches data for the profile builder page
 */

import { createClient } from '@/lib/supabase/client'

export interface AgentActivitySummary {
  [agentId: string]: { count: number; latestAt: string }
}

export async function fetchProfileAgentActivity(): Promise<{
  agentActivity: AgentActivitySummary
  userId: string | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { agentActivity: {}, userId: null }

  const { data } = await supabase
    .from('agent_artifacts')
    .select('agent_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const agentActivity: AgentActivitySummary = {}
  if (data) {
    for (const row of data as { agent_id: string; created_at: string }[]) {
      if (!agentActivity[row.agent_id]) {
        agentActivity[row.agent_id] = { count: 0, latestAt: row.created_at }
      }
      agentActivity[row.agent_id].count++
    }
  }

  return { agentActivity, userId: user.id }
}
