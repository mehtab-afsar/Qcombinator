/**
 * Dashboard Service — Supabase queries and API fetches for the dashboard page
 * Pure async functions, no React
 */

import { createClient } from '@/lib/supabase/client'

export interface DashPriority {
  title: string
  why: string
  action: string
  agentId?: string
  urgency: 'high' | 'medium' | 'low'
}

export interface DashboardData {
  usedAgentIds: Set<string>
  scoreHistory: Array<{
    overall: number; market: number; product: number; gtm: number
    financial: number; team: number; traction: number
    date: string; source: string
  }>
  weeklyActivity: number
  investorMatches: number
  portfolioViews: { total: number; last7: number }
  pendingActions: PendingRow[]
  conflictDims: Set<string>
  priorities: DashPriority[]
}

export interface PendingRow {
  id: string
  agent_id: string
  action_type: string
  title: string
  summary: string
  created_at: string
}

/** Fetches all dashboard analytics data for the current user. */
export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const empty: DashboardData = {
    usedAgentIds: new Set(),
    scoreHistory: [],
    weeklyActivity: 0,
    investorMatches: 0,
    portfolioViews: { total: 0, last7: 0 },
    pendingActions: [],
    conflictDims: new Set(),
    priorities: [],
  }

  if (!user) return empty

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    priorityRes,
    { data: artifactRows },
    { data: scoreRows },
    { count: activityCount },
    { count: matchCount },
    analyticsRes,
    { data: pendingRows },
    { data: conflictRow },
  ] = await Promise.all([
    fetch('/api/qscore/priority').then(r => r.ok ? r.json() : null).catch(() => null),

    supabase
      .from('agent_artifacts')
      .select('agent_id')
      .eq('user_id', user.id),

    supabase
      .from('qscore_history')
      .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at, data_source')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: true })
      .limit(20),

    supabase
      .from('agent_activity')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekAgo),

    supabase
      .from('connection_requests')
      .select('demo_investor_id', { count: 'exact', head: true })
      .eq('founder_id', user.id),

    fetch(`/api/p/${user.id}/analytics`).then(r => r.ok ? r.json() : null).catch(() => null),

    supabase
      .from('pending_actions')
      .select('id, agent_id, action_type, title, summary, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('qscore_history')
      .select('ai_actions')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const usedAgentIds = new Set(
    (artifactRows ?? []).map((r: { agent_id: string }) => r.agent_id)
  )
  const scoreHistory = (scoreRows ?? []).map((r: {
    overall_score: number; market_score: number; product_score: number;
    gtm_score: number; financial_score: number; team_score: number;
    traction_score: number; calculated_at: string; data_source: string;
  }) => ({
    overall:   r.overall_score   ?? 0,
    market:    r.market_score    ?? 0,
    product:   r.product_score   ?? 0,
    gtm:       r.gtm_score       ?? 0,
    financial: r.financial_score ?? 0,
    team:      r.team_score      ?? 0,
    traction:  r.traction_score  ?? 0,
    date:      r.calculated_at,
    source:    r.data_source ?? 'assessment',
  }))
  const portfolioViews = analyticsRes && typeof analyticsRes.totalViews === 'number'
    ? { total: analyticsRes.totalViews, last7: analyticsRes.last7Days ?? 0 }
    : { total: 0, last7: 0 }

  const conflictDims = new Set<string>(
    (conflictRow?.ai_actions?.rag_eval?.conflicts as Array<{ dimension?: string }> ?? [])
      .map((c: { dimension?: string }) => c.dimension)
      .filter(Boolean) as string[]
  )

  const priorities: DashPriority[] = (priorityRes as { priorities?: DashPriority[] } | null)?.priorities ?? []

  return {
    usedAgentIds,
    scoreHistory,
    weeklyActivity:  activityCount ?? 0,
    investorMatches: matchCount    ?? 0,
    portfolioViews,
    pendingActions:  (pendingRows ?? []) as PendingRow[],
    conflictDims,
    priorities,
  }
}
