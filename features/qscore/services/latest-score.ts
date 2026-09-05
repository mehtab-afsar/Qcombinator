/**
 * The founder's real Q-Score, read-only — for Company Context (layer 4), never for scoring
 * logic. Extracted out of lib/mandate/strategy-proposal.ts's own inline query so
 * lib/rhythm/context.ts can reuse the exact same read instead of a third copy of it
 * (CLAUDE.md §4: one source of truth per fact).
 *
 * Nothing here writes. Reading a summary never moves the Q-Score (ADR-005) — asserted by
 * __tests__/score-invariant.test.ts, which scans lib/rhythm and lib/mandate (not this folder,
 * the same folder the score signal's own writer lives in) for its name.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DIM_LABELS } from '@/features/qscore/constants/dimensions'

interface ScoreRow {
  overall_score: number
  p1_score: number | null
  p2_score: number | null
  p3_score: number | null
  p4_score: number | null
  p5_score: number | null
  p6_score: number | null
}

export interface ScoreSummary {
  overall: number
  summary: string
}

export interface ScoreHistoryPoint {
  overall: number
  calculatedAt: string
}

/**
 * A short, honest read of the score for a prompt — the weakest and strongest dimension, nothing
 * else invented. Deliberately not the full decay/RAG pipeline app/api/qscore/latest/route.ts
 * owns — that logic is a display concern for the founder-facing number; for prompt context the
 * latest raw dimension scores are enough, and re-deriving that pipeline here would be a second,
 * riskier copy of it.
 */
function summarizeScore(row: ScoreRow): string {
  const dims = (['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const)
    .map(id => ({ id, label: DIM_LABELS[id], score: row[`${id}_score` as const] }))
    .filter(d => d.score !== null) as Array<{ id: string; label: string; score: number }>

  if (dims.length === 0) return ''

  const sorted = [...dims].sort((a, b) => a.score - b.score)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]

  if (weakest.id === strongest.id) return `${weakest.label}: ${weakest.score}`
  return `Weakest: ${weakest.label} (${weakest.score}). Strongest: ${strongest.label} (${strongest.score}).`
}

/**
 * The founder's single most recent Q-Score, or null if none exists yet. Unlike the mandate
 * flow's own use of this same read, a missing score here is not exceptional — a weekly cycle
 * must still run for a founder who hasn't been scored yet, just without this context.
 */
export async function getLatestScoreSummary(
  supabase: SupabaseClient,
  founderId: string,
): Promise<ScoreSummary | null> {
  const { data: scoreRow } = await supabase
    .from('qscore_history')
    .select('overall_score, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score')
    .eq('user_id', founderId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!scoreRow) return null
  return { overall: scoreRow.overall_score, summary: summarizeScore(scoreRow as ScoreRow) }
}

/**
 * A short, oldest-first trend series for a narrative like AS021's Q-Score Trend Report. Capped
 * small and fetched unconditionally alongside every cycle's Company Context (see
 * lib/rhythm/context.ts) rather than only when a Program that needs it is active — keeps the
 * context builder Program-agnostic, at the cost of one small read on cycles that won't use it.
 */
export async function getScoreHistory(
  supabase: SupabaseClient,
  founderId: string,
  limit = 6,
): Promise<ScoreHistoryPoint[]> {
  const { data } = await supabase
    .from('qscore_history')
    .select('overall_score, calculated_at')
    .eq('user_id', founderId)
    .order('calculated_at', { ascending: false })
    .limit(limit)

  return (data ?? [])
    .map(row => ({ overall: row.overall_score as number, calculatedAt: row.calculated_at as string }))
    .reverse()
}
