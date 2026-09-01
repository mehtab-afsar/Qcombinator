import { routedText } from '@/lib/llm/router'
import { log } from '@/lib/logger'
import { buildExtractionPrompt } from './prompt'
import { parseExtractionResponse } from './parse'
import { buildFallbackExtractions } from './fallback'
import type { EvidenceItem } from '../evidence/gather'
import type { IndicatorExtraction } from '../scoring/types'

export interface ExtractionOutcome {
  extractions: IndicatorExtraction[]
  aiGenerated: boolean
}

/**
 * Orchestrates the LLM extraction call + parse, falling back to the honest all-null state on any
 * failure — thrown error, or a successful-but-malformed/incomplete response. Never a hard
 * failure point for the submit route.
 */
export async function generateExtractions(evidenceItems: EvidenceItem[]): Promise<ExtractionOutcome> {
  try {
    const messages = buildExtractionPrompt(evidenceItems)
    const raw = await routedText('extraction', messages, { maxTokens: 6000, temperature: 0.1 })
    const parsed = parseExtractionResponse(raw)
    if (parsed) return { extractions: parsed, aiGenerated: true }
    log.warn('qscore-lite: extraction response missing/malformed, using fallback')
  } catch (err) {
    log.warn('qscore-lite: extraction call failed, using fallback', { err: (err as Error)?.message })
  }
  return { extractions: buildFallbackExtractions(), aiGenerated: false }
}
