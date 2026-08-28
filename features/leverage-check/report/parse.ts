export interface ParsedReport {
  shortResult: string
  fullReport: string
  aiGenerated: boolean
}

/**
 * Splits the LLM's raw text on the literal FULL_REPORT marker per the system prompt's own
 * output contract (SHORT_RESULT ... FULL_REPORT ...). Returns null — never throws — if the
 * marker is missing or either half is empty after trim, so the caller can fall back to the
 * local template instead of surfacing a broken/partial result.
 */
export function parseLeverageCheckResponse(raw: string): ParsedReport | null {
  const marker = 'FULL_REPORT'
  const idx = raw.indexOf(marker)
  if (idx === -1) return null

  const shortResult = raw.slice(0, idx).replace(/^SHORT_RESULT\s*/, '').trim()
  const fullReport = raw.slice(idx + marker.length).trim()
  if (!shortResult || !fullReport) return null

  return { shortResult, fullReport, aiGenerated: true }
}
