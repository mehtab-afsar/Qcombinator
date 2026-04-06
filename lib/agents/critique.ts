/**
 * Artifact Self-Critique Loop
 *
 * Pass 2: After an artifact is generated, run a lightweight critique pass
 * using the economy model tier to identify weak or missing sections.
 *
 * Pass 3: If critique finds issues, run a patch pass to improve the artifact.
 *
 * Total added latency: ~600–900 ms (economy 8b model).
 * Only fires when FF_ARTIFACT_SELF_CRITIQUE is enabled.
 *
 * PRD §5.4
 */

import { tieredText } from '@/lib/llm/router'

export type SectionRating = 'complete' | 'adequate' | 'weak' | 'missing'

export interface SectionCritique {
  section: string
  rating: SectionRating
  improvement?: string  // only present when rating is 'weak' or 'missing'
}

export interface CritiqueResult {
  sections: SectionCritique[]
  overallRating: 'excellent' | 'good' | 'needs_improvement'
  needsPatch: boolean  // true if any section is 'weak' or 'missing'
  critiqueAt: string
}

const ARTIFACT_SECTIONS: Record<string, string[]> = {
  icp_document:       ['buyerPersona', 'painPoints', 'firmographics', 'recommendedChannels', 'messagingFramework'],
  outreach_sequence:  ['steps', 'subjectLines', 'followUpStrategy'],
  battle_card:        ['competitors', 'ourStrengths', 'objectionHandling', 'winThemes'],
  gtm_playbook:       ['targetSegment', 'acquisitionChannels', 'launchSequence', 'metrics'],
  sales_script:       ['opener', 'discoveryQuestions', 'pitchNarrative', 'objectionResponses', 'closeAsk'],
  brand_messaging:    ['positioningStatement', 'valuePropositions', 'voiceGuide', 'tagline'],
  financial_summary:  ['metrics', 'unitEconomics', 'projections', 'fundingStatus'],
  legal_checklist:    ['incorporationStatus', 'ipProtection', 'employmentContracts', 'regulatoryRequirements'],
  hiring_plan:        ['roles', 'compensationRanges', 'hiringTimeline', 'cultureValues'],
  pmf_survey:         ['questions', 'targetRespondents', 'successMetrics'],
  competitive_matrix: ['competitors', 'differentiators', 'positioningStatement'],
  strategic_plan:     ['vision', 'okrs', 'milestones', 'keyRisks'],
}

/**
 * Runs a critique pass on a generated artifact.
 * Uses economy-tier model (llama-3.1-8b-instant) — fast and cheap.
 */
export async function critiqueArtifact(
  artifactType: string,
  content: Record<string, unknown>,
): Promise<CritiqueResult> {
  const sections = ARTIFACT_SECTIONS[artifactType] ?? Object.keys(content).slice(0, 6)
  const contentStr = JSON.stringify(content).slice(0, 4000)

  const prompt = `You are a VC partner reviewing a startup's ${artifactType.replace(/_/g, ' ')} document.

Evaluate EACH of these sections: ${sections.join(', ')}

For each section, rate it:
- "complete": specific, detailed, VC-ready content
- "adequate": present but could be stronger
- "weak": exists but is generic/vague/placeholder
- "missing": section absent or empty

For "weak" and "missing" sections only, provide a 1-sentence specific improvement.

Return ONLY valid JSON:
{
  "sections": [
    { "section": "sectionName", "rating": "complete|adequate|weak|missing", "improvement": "optional" }
  ],
  "overallRating": "excellent|good|needs_improvement"
}

Document to review:
${contentStr}`

  try {
    const raw = await tieredText('economy', [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Critique this document now.' },
    ], { maxTokens: 600 })

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const parsed = JSON.parse(match[0]) as {
      sections: Array<{ section: string; rating: string; improvement?: string }>
      overallRating: string
    }

    const critiqueSections: SectionCritique[] = parsed.sections.map(s => ({
      section: s.section,
      rating: (['complete', 'adequate', 'weak', 'missing'].includes(s.rating)
        ? s.rating : 'adequate') as SectionRating,
      improvement: s.improvement,
    }))

    const needsPatch = critiqueSections.some(s => s.rating === 'weak' || s.rating === 'missing')
    const overallRating = (['excellent', 'good', 'needs_improvement'].includes(parsed.overallRating)
      ? parsed.overallRating : 'good') as CritiqueResult['overallRating']

    return { sections: critiqueSections, overallRating, needsPatch, critiqueAt: new Date().toISOString() }
  } catch {
    // Fallback: mark all as adequate
    return {
      sections: sections.map(s => ({ section: s, rating: 'adequate' as SectionRating })),
      overallRating: 'good',
      needsPatch: false,
      critiqueAt: new Date().toISOString(),
    }
  }
}

/**
 * Applies improvements identified in the critique pass.
 * Only called when critiqueResult.needsPatch is true.
 * Uses economy-tier model.
 */
export async function patchArtifact(
  artifactType: string,
  content: Record<string, unknown>,
  critique: CritiqueResult,
): Promise<Record<string, unknown>> {
  const weakSections = critique.sections.filter(s => s.rating === 'weak' || s.rating === 'missing')
  if (weakSections.length === 0) return content

  const patches = weakSections
    .map(s => `- ${s.section}: ${s.improvement ?? 'Improve this section with specific, actionable content.'}`)
    .join('\n')

  const prompt = `You are improving a startup's ${artifactType.replace(/_/g, ' ')} document.

The following sections need improvement:
${patches}

Current document:
${JSON.stringify(content).slice(0, 3000)}

Return the COMPLETE improved document as valid JSON with ALL original fields preserved, plus the improved sections.
Return ONLY the JSON object, no markdown fences.`

  try {
    const raw = await tieredText('economy', [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Apply the improvements now. Return the complete improved JSON.' },
    ], { maxTokens: 2000 })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return content
    const patched = JSON.parse(match[0]) as Record<string, unknown>
    return patched
  } catch {
    return content  // patch failed — return original
  }
}
