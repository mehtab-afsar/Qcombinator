/**
 * Profile Builder — shared utilities
 */

/**
 * Flatten a nested confidence map from the LLM
 * e.g. { p2: { tamDescription: 0.8 } } → { tamDescription: 0.8 }
 * so leaf-key lookups in getSectionCompletionPct always work.
 */
export function flattenConfidence(conf: Record<string, unknown>): Record<string, number> {
  const flat: Record<string, number> = {}
  function recurse(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number') flat[k] = v
      else if (typeof v === 'object' && v !== null && !Array.isArray(v)) recurse(v as Record<string, unknown>)
    }
  }
  recurse(conf)
  return flat
}
