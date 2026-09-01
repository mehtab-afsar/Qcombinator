import { z } from 'zod'
import { INDICATOR_DEFINITIONS } from '../scoring/indicators'
import type { IndicatorExtraction } from '../scoring/types'

const VALID_IDS = new Set<string>(INDICATOR_DEFINITIONS.map(d => d.id))

const extractionEntrySchema = z.object({
  id: z.string(),
  rawScore: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.null()]),
  citedUrls: z.array(z.string()),
  directness: z.enum(['direct', 'strong_proxy', 'indirect_proxy', 'speculative']).nullable(),
  // Nullable — there's nothing to explain when rawScore is null (no evidence found).
  reasoning: z.string().nullable(),
}).refine(
  e => (e.rawScore === null) === (e.directness === null),
  { message: 'directness must be non-null iff rawScore is non-null' },
)

const extractionResponseSchema = z.object({
  indicators: z.array(extractionEntrySchema),
})

/**
 * Fence-strip + JSON.parse, with a {...} regex fallback on failure — this codebase's established
 * convention for structured LLM output (app/api/qscore/priority/route.ts). Returns null (never
 * throws) on any parse/validation failure, or if the response doesn't cover all 20 indicator ids
 * — the caller falls back to the all-null state rather than surface a partial result as real.
 */
export function parseExtractionResponse(raw: string): IndicatorExtraction[] | null {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let json: unknown
  try {
    json = JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      json = JSON.parse(match[0])
    } catch {
      return null
    }
  }

  const result = extractionResponseSchema.safeParse(json)
  if (!result.success) return null

  const seenIds = new Set(result.data.indicators.map(e => e.id))
  if (![...VALID_IDS].every(id => seenIds.has(id))) return null
  if (result.data.indicators.some(e => !VALID_IDS.has(e.id))) return null

  return result.data.indicators as IndicatorExtraction[]
}
