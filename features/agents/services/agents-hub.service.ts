/**
 * Agents Hub Service — Supabase queries for the agents hub page
 * Pure async functions, no React
 */

import { createClient } from '@/lib/supabase/client'

export interface AgentHubData {
  completedAgentIds: Set<string>
  recommendedIds: string[]
}

/** Dimension → agent ID mapping (mirrors DIMENSION_AGENT in the agents hub page). */
const DIMENSION_AGENT: Record<string, string> = {
  market:     'atlas',
  product:    'nova',
  goToMarket: 'patel',
  financial:  'felix',
  team:       'harper',
  traction:   'susi',
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

  // Latest Q-Score dimensions to determine recommendations
  const { data: score } = await supabase
    .from('qscore_history')
    .select('market_score, product_score, gtm_score, financial_score, team_score, traction_score')
    .eq('user_id', user.id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  let recommendedIds: string[] = []
  if (score) {
    const dimScores: Record<string, number> = {
      market:     score.market_score    ?? 0,
      product:    score.product_score   ?? 0,
      goToMarket: score.gtm_score       ?? 0,
      financial:  score.financial_score ?? 0,
      team:       score.team_score      ?? 0,
      traction:   score.traction_score  ?? 0,
    }
    recommendedIds = Object.entries(dimScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([dim]) => DIMENSION_AGENT[dim])
      .filter(Boolean)
  }

  return { completedAgentIds, recommendedIds }
}
