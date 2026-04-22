import { routedText } from '@/lib/llm/router'
import { log } from '@/lib/logger'

export interface SemanticIssue {
  field: string
  originalValue: unknown
  correctedValue: unknown | null  // null = clear the field (was wrong); undefined = flag only
  reason: string
  severity: 'corrected' | 'flagged'
}

// Traverse a dot-path like "financial.mrr" and set the value
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}
    cur = cur[parts[i]] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

// Traverse a dot-path and read the current value
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

const SYSTEM_PROMPT = `You are a data quality auditor reviewing startup metrics extracted from pitch decks and financial documents.

Given a JSON object of extracted fields and the source document excerpt, find ONLY these specific errors:

1. Year values (2023/2024/2025/2026/2027) assigned to numeric metric fields like MRR, ARR, revenue, customers. Years are never revenue figures.
2. Future-dated or projected values in present-tense fields. MRR/ARR/revenue must reflect CURRENT actuals, not targets.
   Red flags: "expected", "projected", "target", "goal", "by 2025", "forecast", "planning to", "will reach".
3. Order-of-magnitude errors — document context says "million" but extracted value suggests "billion", or vice versa.
4. Conditional estimates used as direct actuals — e.g. "18 months with a team of 10" is NOT a standalone replication time.
5. Fields that are null/missing but the value is clearly and unambiguously stated in the source text.

RULES:
- Only flag items where you are >90% confident an error exists.
- An empty array is correct when no errors are found — do not invent issues.
- Do NOT flag values that are plausible — only clear semantic errors.
- Do NOT flag missing optional fields as errors.
- correctedValue should be null to clear a wrong value, or the corrected value if you can determine it confidently.
- For case 5 (missing but stated), set severity to "flagged" and correctedValue to the value from the document.

Return valid JSON only:
{ "corrections": [{ "field": "financial.mrr", "correctedValue": null, "reason": "Value 2026 is a year, not MRR", "severity": "corrected" }] }`

export async function semanticVerify(
  extracted: Record<string, unknown>,
  docContext: string
): Promise<{ corrected: Record<string, unknown>; issues: SemanticIssue[] }> {
  const corrected = JSON.parse(JSON.stringify(extracted)) as Record<string, unknown>
  const issues: SemanticIssue[] = []

  // Only check fields that have values — nothing to verify if a field is already null
  const financialFields = ['financial.mrr', 'financial.arr', 'financial.monthlyBurn', 'financial.runway', 'financial.grossMargin']
  const defensibilityFields = ['p3.replicationTimeMonths', 'p3.replicationCostUsd']
  const fieldsToCheck = [...financialFields, ...defensibilityFields].filter(f => {
    const v = getNestedValue(extracted, f)
    return v !== null && v !== undefined
  })

  if (fieldsToCheck.length === 0 && docContext.length < 100) {
    return { corrected, issues }
  }

  const extractedSubset: Record<string, unknown> = {}
  for (const f of fieldsToCheck) {
    extractedSubset[f] = getNestedValue(extracted, f)
  }

  let raw = ''
  try {
    raw = await routedText('reasoning', [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extracted fields:\n${JSON.stringify(extractedSubset, null, 2)}\n\nSource document excerpt:\n${docContext.slice(0, 2500)}`,
      },
    ], { maxTokens: 600 })
  } catch (e) {
    log.warn('[semanticVerify] reasoning call failed (non-blocking):', e instanceof Error ? e.message : e)
    return { corrected, issues }
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { corrected, issues }
    const parsed = JSON.parse(jsonMatch[0]) as { corrections?: Array<{ field: string; correctedValue: unknown; reason: string; severity?: string }> }
    const corrections = parsed.corrections ?? []

    for (const c of corrections) {
      const originalValue = getNestedValue(extracted, c.field)
      const severity = (c.severity === 'flagged' ? 'flagged' : 'corrected') as SemanticIssue['severity']
      issues.push({ field: c.field, originalValue, correctedValue: c.correctedValue ?? null, reason: c.reason, severity })
      if (severity === 'corrected') {
        setNestedValue(corrected, c.field, c.correctedValue ?? null)
      }
    }
  } catch (e) {
    log.warn('[semanticVerify] failed to parse LLM response:', e instanceof Error ? e.message : e)
  }

  return { corrected, issues }
}
