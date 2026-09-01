import { INDICATOR_DEFINITIONS } from '../scoring/indicators'
import type { IndicatorExtraction } from '../scoring/types'

/**
 * Unlike the Leverage Check's fallback (which falls back to a full templated prose report from
 * an already-known deterministic score), there is no deterministic score to fall back to here —
 * the LLM extraction step is the only source of rawScore. So the fallback is honest degradation:
 * every indicator becomes null ("we found nothing / couldn't verify," not a fabricated score).
 * aggregate.ts turns this into a defined qslScore: 0, confidencePct: 0 — the results UI is
 * responsible for showing "insufficient public evidence" messaging in that case, not presenting
 * the bare 0 as if it were a real fundability reading.
 */
export function buildFallbackExtractions(): IndicatorExtraction[] {
  return INDICATOR_DEFINITIONS.map(d => ({
    id: d.id,
    rawScore: null,
    citedUrls: [],
    directness: null,
    reasoning: 'Evidence extraction was unavailable for this lookup.',
  }))
}
