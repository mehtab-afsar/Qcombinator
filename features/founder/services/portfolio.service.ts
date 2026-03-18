/**
 * Portfolio Service — Supabase queries and API fetches for the portfolio page
 * Pure async functions, no React
 */

import { createClient } from '@/lib/supabase/client'

export interface PortfolioScoreDim {
  score: number
  trend: 'up' | 'down' | 'neutral'
  change: number
}

export interface PortfolioScore {
  overall: number
  percentile: number
  breakdown: Record<string, PortfolioScoreDim>
}

export interface PortfolioArtifact {
  id: string
  artifact_type: string
  title: string
  agent_id: string
  created_at: string
}

export interface PortfolioEvidence {
  id: string
  dimension: string
  evidence_type: string
  title: string
  status: string
  points_awarded: number
  created_at: string
}

export interface PortfolioData {
  score: PortfolioScore | null
  artifacts: PortfolioArtifact[]
  agentCount: number
  evidence: PortfolioEvidence[]
  viewStats: { total: number; last7: number } | null
  userId: string | null
}

/** Fetches all data needed for the portfolio page. */
export async function fetchPortfolioData(): Promise<PortfolioData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { score: null, artifacts: [], agentCount: 0, evidence: [], viewStats: null, userId: null }

  // Q-Score from API
  let score: PortfolioScore | null = null
  const scoreRes = await fetch('/api/qscore/latest')
  if (scoreRes.ok) {
    const d = await scoreRes.json()
    if (d.qScore) score = { overall: d.qScore.overall, percentile: d.qScore.percentile ?? 50, breakdown: d.qScore.breakdown }
  }

  // Artifacts
  const { data: arts } = await supabase
    .from('agent_artifacts')
    .select('id, artifact_type, title, agent_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const artifacts = arts ?? []
  const agentCount = new Set(artifacts.map((a: PortfolioArtifact) => a.agent_id)).size

  // Verified evidence
  const { data: evData } = await supabase
    .from('score_evidence')
    .select('id, dimension, evidence_type, title, status, points_awarded, created_at')
    .eq('user_id', user.id)
    .eq('status', 'verified')
    .order('created_at', { ascending: false })
  const evidence = evData ?? []

  // Analytics
  let viewStats: { total: number; last7: number } | null = null
  const analyticsRes = await fetch(`/api/p/${user.id}/analytics`)
  if (analyticsRes.ok) {
    const d = await analyticsRes.json()
    viewStats = { total: d.totalViews, last7: d.last7Days }
  }

  return { score, artifacts, agentCount, evidence, viewStats, userId: user.id }
}
