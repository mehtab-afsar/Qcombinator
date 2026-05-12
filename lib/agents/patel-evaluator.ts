/**
 * Independent artifact evaluator.
 *
 * Intentionally receives NO founder profile, NO Patel indicator context,
 * and NO agent system prompt — only the artifact JSON and a clean audit rubric.
 * This prevents the self-referential loop where Patel evaluates its own output
 * with the same context that produced it.
 */

import { routedText } from '@/lib/llm/router'

export interface IndependentEvalResult {
  qualityScore: number      // 0–100 (completeness 0–40 + specificity 0–40 + actionability 0–20)
  gaps: string[]            // improvement suggestions
  confidenceIssues: string[] // VALIDATED claims without concrete evidence
}

export async function evaluateArtifactIndependently(
  artifactType: string,
  artifactContent: Record<string, unknown>,
): Promise<IndependentEvalResult> {
  const typeName = artifactType.replace(/_/g, ' ')

  const result = await routedText('reasoning', [
    {
      role: 'system',
      content: `You are an independent GTM artifact auditor. You have NO context about how this was created — judge only what is in front of you.

Score this ${typeName} on:
- Completeness (0–40): all expected sections present and substantive (not placeholder text)
- Specificity (0–40): concrete details — named personas, quantified metrics, real observable trigger events — vs generic language ("mid-market companies", "pain in the sales process", "decision makers")
- Actionability (0–20): a founder can act on this today without further clarification

Also flag any fields that claim to be VALIDATED or high-confidence but contain only generic language. Those are confidence mismatches — the label overstates the evidence quality.

Reply ONLY with valid JSON (no markdown fences):
{ "qualityScore": <integer 0–100>, "gaps": ["..."], "confidenceIssues": ["..."] }`,
    },
    {
      role: 'user',
      content: JSON.stringify(artifactContent).slice(0, 4000),
    },
  ], { maxTokens: 400 })

  try {
    const clean = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean) as { qualityScore?: number; gaps?: string[]; confidenceIssues?: string[] }
    return {
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 75,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      confidenceIssues: Array.isArray(parsed.confidenceIssues) ? parsed.confidenceIssues : [],
    }
  } catch {
    // Evaluator parse failure is a signal, not a clean pass.
    // Score 0 forces the regen path so the artifact is retried rather than silently accepted.
    return { qualityScore: 0, gaps: ['evaluator_parse_failure'], confidenceIssues: [] }
  }
}
