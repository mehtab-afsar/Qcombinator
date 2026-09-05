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
import { getLatestScoreSummary } from '@/features/qscore/services/latest-score'
import type { CompanyContext } from '@/lib/prompts/compose'

export { MandateGenerationError }

export interface ProposeStrategyInput {
  /** Founder-supplied, optional — the one raw fact the system doesn't already have. */
  currentTraction?: string
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
  const [{ data: profile }, scoreSummary] = await Promise.all([
    supabase.from('founder_profiles').select('company_name').eq('user_id', founderId).maybeSingle(),
    getLatestScoreSummary(supabase, founderId),
  ])

  if (!scoreSummary) {
    throw new MandateGenerationError('There is no Q-Score to draft a direction from yet.')
  }

  return {
    companyName: (profile as { company_name?: string } | null)?.company_name ?? undefined,
    currentDate: new Date().toISOString().slice(0, 10),
    qScore: scoreSummary,
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
