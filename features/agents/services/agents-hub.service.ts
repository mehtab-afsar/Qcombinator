/**
 * Agents Hub Service — Supabase queries for the agents hub page
 * Pure async functions, no React
 */

import { createClient } from '@/lib/supabase/client'
import { AGENT_IDS } from '@/lib/constants/agent-ids'

export interface AgentHubData {
  completedAgentIds: Set<string>
  recommendedIds: string[]
}

/** Param → agent ID mapping (P1-P6 schema). */
const DIMENSION_AGENT: Record<string, string> = {
  p1: AGENT_IDS.PATEL,
  p2: AGENT_IDS.ATLAS,
  p3: AGENT_IDS.NOVA,
  p4: AGENT_IDS.HARPER,
  p5: AGENT_IDS.SAGE,
  p6: AGENT_IDS.FELIX,
}

/** Fetches completed agent IDs and recommended agents based on Q-Score. */
export async function fetchAgentHubData(): Promise<AgentHubData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { completedAgentIds: new Set(), recommendedIds: [] }

  // Completed agents (any artifact generated)
  const { data: artifacts } = await supabase
    .from('agent_artifacts')
    .select('agent_id')
    .eq('user_id', user.id)

  const completedAgentIds = new Set(
    artifacts?.map((a: { agent_id: string }) => a.agent_id) ?? []
  )

  // Latest Q-Score params to determine recommendations
  const { data: score } = await supabase
    .from('qscore_history')
    .select('p1_score, p2_score, p3_score, p4_score, p5_score, p6_score')
    .eq('user_id', user.id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  let recommendedIds: string[] = []
  if (score) {
    const dimScores: Record<string, number> = {
      p1: score.p1_score ?? 0,
      p2: score.p2_score ?? 0,
      p3: score.p3_score ?? 0,
      p4: score.p4_score ?? 0,
      p5: score.p5_score ?? 0,
      p6: score.p6_score ?? 0,
    }
    recommendedIds = Object.entries(dimScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([dim]) => DIMENSION_AGENT[dim])
      .filter(Boolean)
  }

  return { completedAgentIds, recommendedIds }
}
