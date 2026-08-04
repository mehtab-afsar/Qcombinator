/**
 * F07b — assemble Company Context and run S001, mirroring how contract.ts's
 * createDraft assembles context for S002 (F08b).
 *
 * Deliberately NOT the same file as strategy.ts. strategy.ts is the single writer
 * for `strategy_sessions` — pure CRUD, no model calls, testable without mocking an
 * LLM. This file only reads (Q-Score, company name) and proposes; it never writes
 * to strategy_sessions. The founder's own review — editing the proposal, then
 * POSTing to /api/strategy — is what actually saves anything.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateStrategyProposal, MandateGenerationError, type GeneratedStrategy } from './generate'
import { DIM_LABELS } from '@/features/qscore/constants/dimensions'
import type { CompanyContext } from '@/lib/prompts/compose'

export { MandateGenerationError }

export interface ProposeStrategyInput {
  /** Founder-supplied, optional — the one raw fact the system doesn't already have. */
  currentTraction?: string
}

interface ScoreRow {
  overall_score: number
  p1_score: number | null
  p2_score: number | null
  p3_score: number | null
  p4_score: number | null
  p5_score: number | null
  p6_score: number | null
}

/**
 * A short, honest read of the score for the prompt — the weakest and strongest
 * dimension, nothing else invented. Deliberately not the full decay/RAG pipeline
 * app/api/qscore/latest/route.ts owns — that logic is a display concern for the
 * founder-facing number; for prompt context the latest raw dimension scores are
 * enough, and re-deriving that pipeline here would be a second, riskier copy of it.
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
 * Assemble the Company Context a Strategy proposal reasons from — the founder's
 * real Q-Score, company name, and any traction note. Exported separately from
 * `proposeStrategy` below so a streaming caller (the SSE route) can build the
 * context, then call `composeMandatePrompt`/`routedStream` directly instead of
 * going through a single blocking call — same data, same query, two shapes of use.
 *
 * @throws MandateGenerationError if there is no score yet — the caller's cue to
 *   fall back to a blank, founder-authored form.
 */
export async function buildStrategyContext(
  supabase: SupabaseClient,
  founderId: string,
  input: ProposeStrategyInput,
): Promise<CompanyContext> {
  const [{ data: profile }, { data: scoreRow }] = await Promise.all([
    supabase.from('founder_profiles').select('company_name').eq('user_id', founderId).maybeSingle(),
    supabase
      .from('qscore_history')
      .select('overall_score, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score')
      .eq('user_id', founderId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!scoreRow) {
    throw new MandateGenerationError('There is no Q-Score to draft a direction from yet.')
  }

  return {
    companyName: (profile as { company_name?: string } | null)?.company_name ?? undefined,
    currentDate: new Date().toISOString().slice(0, 10),
    qScore: { overall: scoreRow.overall_score, summary: summarizeScore(scoreRow as ScoreRow) },
    newInformation: input.currentTraction?.trim() || undefined,
  }
}

/**
 * Propose a Strategy from the founder's real Q-Score and company context — the
 * non-streaming shape (still used by tests and any future non-UI caller).
 *
 * @throws MandateGenerationError if there is no score yet, or the model call fails.
 *   Both are the caller's cue to fall back to a blank, founder-authored form.
 */
export async function proposeStrategy(
  supabase: SupabaseClient,
  founderId: string,
  input: ProposeStrategyInput,
): Promise<GeneratedStrategy> {
  const context = await buildStrategyContext(supabase, founderId, input)
  return generateStrategyProposal(context)
}
