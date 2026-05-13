/**
 * Patel Question Bank Selector
 * Selects curated questions from DIAGNOSTIC_QUESTIONS for the active constraint dimension.
 * Injects into system prompt so the LLM draws from the curated bank instead of inventing questions.
 */

import { DIAGNOSTIC_QUESTIONS } from '@/features/agents/patel/prompts/diagnostic-questions'
import { PATEL_DIMENSIONS } from '@/lib/constants/patel-indicators'
import type { PatelScores, PatelConfidence, IndicatorScore } from '@/lib/constants/patel-indicators'

/**
 * Returns a QUESTION BANK block to inject into the Patel system prompt, pre-selected
 * for the most upstream dimension with weak/unassessed indicators.
 * Returns '' when all 20 indicators are scored ≥ 3 (nothing left to ask).
 */
export function buildPatelQuestionBank(
  scores: PatelScores | undefined,
  _confidence: PatelConfidence | undefined,
): string {
  if (!scores) return ''

  for (const dim of PATEL_DIMENSIONS) {
    const weakIds = dim.indicatorIds.filter(id => {
      const s = scores[id] as IndicatorScore | undefined
      return !s || s <= 2
    })
    if (weakIds.length === 0) continue // all ≥ 3 in this dimension — advance to next

    // Take the 2 weakest/unassessed indicators
    const selected = weakIds.slice(0, 2)
    const lines: string[] = []

    for (const id of selected) {
      const bank = DIAGNOSTIC_QUESTIONS[id]
      if (!bank?.questions.length) continue
      lines.push(`  [${bank.indicatorName}] ${bank.questions[0].question}`)
    }

    if (!lines.length) continue

    return `\n\nQUESTION BANK — Active constraint: ${dim.label}. Choose ONE of these for your next turn:\n${lines.join('\n')}\nAsk the one that fits most naturally given what the founder just said. Do not ask both in one message.`
  }

  return '' // all 20 indicators ≥ 3
}
