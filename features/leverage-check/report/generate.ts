import { routedText } from '@/lib/llm/router'
import { log } from '@/lib/logger'
import { buildLeverageCheckPrompt } from './prompt'
import { parseLeverageCheckResponse, type ParsedReport } from './parse'
import { buildFallbackReport } from './fallback'
import type { LeverageCheckResult, QuizAnswers } from '../scoring/calculate'

/**
 * Orchestrates the LLM call + parse, falling back to a local template on any failure — the LLM
 * step must never be a hard failure point for this route. Covers both a thrown error (network,
 * rate limit, provider outage) and a successful-but-malformed response (missing markers).
 */
export async function generateLeverageCheckReport(
  result: LeverageCheckResult,
  answers: QuizAnswers,
): Promise<ParsedReport> {
  try {
    const messages = buildLeverageCheckPrompt(result, answers)
    const raw = await routedText('generation', messages, {
      modelTier: 'capable',
      maxTokens: 1400,
      temperature: 0.7,
    })
    const parsed = parseLeverageCheckResponse(raw)
    if (parsed) return parsed
    log.warn('leverage-check: LLM response missing FULL_REPORT marker, using fallback')
  } catch (err) {
    log.warn('leverage-check: LLM call failed, using fallback', { err: (err as Error)?.message })
  }
  return buildFallbackReport(result)
}
