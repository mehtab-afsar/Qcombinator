/**
 * Patel Indicator Updater
 * Infers GTM indicator scores from completed D1–D4 artifact content and upserts to patel_diagnostic_scores.
 * Called after Patel deliverable saves in generate/run/route.ts.
 *
 * Also exports inferIterationAndAlignmentFromMessage for conversation-based P1.4/P1.5 scoring.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IndicatorScore, PatelScores, PatelConfidence } from '@/lib/constants/patel-indicators'
import { routedText } from '@/lib/llm/router'

function clamp(n: number): IndicatorScore {
  return Math.max(1, Math.min(5, Math.round(n))) as IndicatorScore
}

function inferIcpScores(content: Record<string, unknown>): { scores: PatelScores; confidence: PatelConfidence } {
  const scores: PatelScores = {}
  const confidence: PatelConfidence = {}

  // New GOD-TIER schema fields (preferred)
  const personas = (content.personas as Record<string, unknown>[]) ?? []
  const segments = (content.segments as Record<string, unknown>[]) ?? []
  // Legacy schema fallbacks
  const legacyPersona = content.buyerPersona as Record<string, unknown> | undefined
  const legacyFirm = content.firmographics as Record<string, unknown> | undefined

  const pains = (content.painPoints as unknown[]) ?? []
  const channels = (content.channels as unknown[]) ?? []
  const qual = (content.qualificationCriteria as unknown[]) ?? []
  const evType = content.evidence_type as string | undefined
  const conf = Number(content.confidence ?? 0)

  // icp.specificity — prefer new personas[]/segments[] schema; fall back to legacy buyerPersona/firmographics
  const primaryPersona = personas[0] as Record<string, unknown> | undefined
  const primarySegment = (segments.find(s => (s as Record<string, unknown>).is_primary) ?? segments[0]) as Record<string, unknown> | undefined
  const personaSource = primaryPersona ?? legacyPersona

  if (personaSource) {
    const snapshot = primaryPersona?.snapshot as Record<string, unknown> | undefined
    const traitCount = primaryPersona
      ? [(primaryPersona.title_cluster as unknown[])?.length > 0 ? primaryPersona.title_cluster : null, primaryPersona.role_type, primaryPersona.core_pain, primaryPersona.primary_kpi, snapshot?.name].filter(Boolean).length
      : [legacyPersona!.title, legacyPersona!.role, legacyPersona!.seniority, legacyPersona!.dayInLife].filter(Boolean).length
    const segSource = primarySegment ?? legacyFirm
    const firmCount = primarySegment
      ? [primarySegment.industry, primarySegment.company_type, primarySegment.geography].filter(Boolean).length
      : legacyFirm ? [legacyFirm.companySize, legacyFirm.industry, legacyFirm.revenue, legacyFirm.geography].filter(Boolean).length : 0
    void segSource // suppress unused-variable lint
    const qualCount = qual.length
    scores['icp.specificity'] = clamp(Math.round((traitCount + firmCount + qualCount) / 3))
    confidence['icp.specificity'] = 'inferred' // artifact inference can never be VALIDATED
  }

  // icp.validation — infer from evidence_type and confidence
  if (evType) {
    scores['icp.validation'] = evType === 'validated' ? clamp(4 + (conf > 0.8 ? 1 : 0))
      : evType === 'inferred' ? 3
      : 1
    confidence['icp.validation'] = 'inferred' // artifact inference can never be VALIDATED
  }

  // icp.commercial_alignment — infer from pain severity and evidence quality
  // A persona with core_pain + primary_kpi is a stronger commercial alignment signal than painPoints[]
  const highPains = pains.filter((p: unknown) => (p as Record<string, unknown>)?.severity === 'high').length
  const hasKpiAnchoredPersona = personas.some(p => {
    const rp = p as Record<string, unknown>
    return rp.core_pain && rp.primary_kpi
  })
  if (highPains > 0 || hasKpiAnchoredPersona || evType === 'validated') {
    const base = hasKpiAnchoredPersona ? 3 : 2
    scores['icp.commercial_alignment'] = evType === 'validated' ? clamp(base + highPains) : base
    confidence['icp.commercial_alignment'] = 'inferred' // artifact inference can never be VALIDATED
  }

  // icp.team_alignment — can't infer from artifact alone; leave unscored
  // icp.iteration — can't infer from artifact alone; leave unscored

  // Channel indicators from D1 channels array
  if (channels.length > 0) {
    const primaryChannels = (channels as Record<string, unknown>[]).filter(c => c.priority === 'primary').length
    scores['channel.clarity'] = clamp(primaryChannels >= 1 ? 3 : 2)
    confidence['channel.clarity'] = 'inferred'
  }

  return { scores, confidence }
}

function inferInsightScores(content: Record<string, unknown>): { scores: PatelScores; confidence: PatelConfidence } {
  const scores: PatelScores = {}
  const confidence: PatelConfidence = {}

  const pains = (content.core_pains as unknown[]) ?? []
  const gains = (content.desired_gains as unknown[]) ?? []
  const triggers = (content.trigger_events as unknown[]) ?? []
  const proof = (content.proof_expectations as unknown[]) ?? []
  const evType = content.evidence_type as string | undefined
  const conf = Number(content.confidence ?? 0)

  if (pains.length > 0) {
    const validatedPains = (pains as Record<string, unknown>[]).filter(p => p.evidence === 'validated').length
    scores['insight.problem'] = clamp(validatedPains >= 2 ? 4 : validatedPains === 1 ? 3 : 2)
    confidence['insight.problem'] = 'inferred' // artifact inference can never be VALIDATED

    // validation depth from pain count and evidence quality
    scores['insight.validation_depth'] = clamp(Math.min(pains.length, 4) + (evType === 'validated' ? 1 : 0))
    confidence['insight.validation_depth'] = 'inferred' // artifact inference can never be VALIDATED
  }

  if (triggers.length > 0) {
    const highUrgency = (triggers as Record<string, unknown>[]).filter(t => t.urgency === 'high').length
    scores['insight.buying'] = clamp(highUrgency >= 2 ? 4 : highUrgency === 1 ? 3 : 2)
    confidence['insight.buying'] = 'inferred'
  }

  if (proof.length > 0) {
    scores['insight.value_proof'] = clamp(proof.length + (conf > 0.75 ? 1 : 0))
    confidence['insight.value_proof'] = 'inferred' // artifact inference can never be VALIDATED
  }

  if (gains.length > 0) {
    scores['insight.context'] = clamp(gains.length >= 3 ? 3 : 2)
    confidence['insight.context'] = 'inferred'
  }

  return { scores, confidence }
}

function inferChannelScores(content: Record<string, unknown>): { scores: PatelScores; confidence: PatelConfidence } {
  const scores: PatelScores = {}
  const confidence: PatelConfidence = {}

  const stages = (content.stages as unknown[]) ?? []
  const evType = content.evidence_type as string | undefined

  if (stages.length > 0) {
    scores['channel.execution_consistency'] = evType === 'validated' ? 4 : 3
    confidence['channel.execution_consistency'] = 'inferred'

    scores['channel.icp_fit'] = evType === 'validated' ? 4 : 2
    confidence['channel.icp_fit'] = 'inferred'

    scores['channel.focus_discipline'] = 3
    confidence['channel.focus_discipline'] = 'inferred'

    scores['channel.learning_loop'] = evType === 'validated' ? 3 : 2
    confidence['channel.learning_loop'] = 'inferred'
  }

  return { scores, confidence }
}

function inferMessageScores(content: Record<string, unknown>): { scores: PatelScores; confidence: PatelConfidence } {
  const scores: PatelScores = {}
  const confidence: PatelConfidence = {}

  const foundation = content.foundation as Record<string, unknown> | undefined
  const pillars = (content.message_pillars as unknown[]) ?? []
  const evType = content.evidence_type as string | undefined
  const conf = Number(content.confidence ?? 0)

  if (foundation) {
    const hasPositioning = Boolean(foundation.positioning_statement)
    const hasValueProp = Boolean(foundation.value_proposition)
    const hasPitch = Boolean(foundation.elevator_pitch)
    const richness = [hasPositioning, hasValueProp, hasPitch].filter(Boolean).length
    scores['message.simplicity'] = clamp(richness + (evType === 'validated' ? 1 : 0))
    confidence['message.simplicity'] = 'inferred' // artifact inference can never be VALIDATED
  }

  if (pillars.length > 0) {
    const withProof = (pillars as Record<string, unknown>[]).filter(p => p.proof && String(p.proof).length > 10).length
    scores['message.proof'] = clamp(withProof >= 2 ? 4 : withProof === 1 ? 3 : 2)
    confidence['message.proof'] = 'inferred'

    scores['message.differentiation'] = clamp(pillars.length >= 3 ? 3 : 2)
    confidence['message.differentiation'] = 'inferred'
  }

  scores['message.icp_relevance'] = evType === 'validated' ? clamp(3 + (conf > 0.75 ? 1 : 0)) : 2
  confidence['message.icp_relevance'] = 'inferred' // artifact inference can never be VALIDATED

  // message.comprehension — can't infer from artifact alone
  return { scores, confidence }
}

/**
 * Infers P1.4 (icp.iteration) and P1.5 (icp.team_alignment) from a founder conversation message.
 * Called fire-and-forget from the chat route after D1 is complete and these indicators are unassessed.
 * These two indicators cannot be inferred from artifact content — they require behavioral signals.
 */
export async function inferIterationAndAlignmentFromMessage(
  userId: string,
  message: string,
  existingScores: PatelScores,
  supabase: SupabaseClient,
): Promise<void> {
  const needsIteration = !existingScores['icp.iteration']
  const needsTeamAlignment = !existingScores['icp.team_alignment']
  if (!needsIteration && !needsTeamAlignment) return
  if (message.trim().length < 15) return

  try {
    const extractPrompt = `Analyze this founder message for two GTM indicator signals. Return valid JSON only, no explanation.

Message: "${message.slice(0, 600)}"

Return exactly this JSON:
{
  "icp_iteration": null or 1-5,
  "icp_team_alignment": null or 1-5
}

Scoring rules:
icp_iteration — has the founder tested this ICP with real outreach?
  1 = no attempt / brand new ICP
  2 = a few messages sent, no results yet
  3 = tested 10+ times, has initial data
  4 = refined based on results
  5 = validated pattern, proven conversion
  null = no relevant signal in the message

icp_team_alignment — does the team share and use this ICP?
  1 = solo founder only, no team involved
  2 = has team but ICP not shared yet
  3 = team has seen the ICP
  4 = team actively uses ICP in their process
  5 = full org alignment
  null = no relevant signal in the message`

    const raw = await routedText('extraction', [
      { role: 'system', content: extractPrompt },
      { role: 'user', content: 'Extract signals.' },
    ])
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const newScores: PatelScores = {}
    const newConfidence: PatelConfidence = {}

    if (needsIteration && parsed.icp_iteration !== null && typeof parsed.icp_iteration === 'number') {
      newScores['icp.iteration'] = clamp(parsed.icp_iteration)
      newConfidence['icp.iteration'] = 'inferred'
    }
    if (needsTeamAlignment && parsed.icp_team_alignment !== null && typeof parsed.icp_team_alignment === 'number') {
      newScores['icp.team_alignment'] = clamp(parsed.icp_team_alignment)
      newConfidence['icp.team_alignment'] = 'inferred'
    }

    if (Object.keys(newScores).length === 0) return

    const { data: existing } = await supabase
      .from('patel_diagnostic_scores')
      .select('scores, confidence')
      .eq('user_id', userId)
      .single()

    const mergedScores = { ...(existing?.scores ?? {}), ...newScores }
    const mergedConfidence = { ...(existing?.confidence ?? {}), ...newConfidence }

    await supabase.from('patel_diagnostic_scores').upsert({
      user_id: userId,
      scores: mergedScores,
      confidence: mergedConfidence,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch { /* fire-and-forget — non-critical */ }
}

export async function updatePatelIndicatorsFromArtifact(
  userId: string,
  artifactType: string,
  content: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  let inferred: { scores: PatelScores; confidence: PatelConfidence } = { scores: {}, confidence: {} }

  if (artifactType === 'icp_document') {
    inferred = inferIcpScores(content)
    // P1.4 iteration: if the founder has generated a prior D1, they're iterating — auto-score
    try {
      const { count } = await supabase
        .from('agent_artifacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('artifact_type', 'icp_document')
      if ((count ?? 0) >= 2) {
        inferred.scores['icp.iteration'] = clamp(Math.min(3, count ?? 2))
        inferred.confidence['icp.iteration'] = 'inferred'
      }
    } catch { /* non-critical */ }
  }
  else if (artifactType === 'pains_gains_triggers') inferred = inferInsightScores(content)
  else if (artifactType === 'buyer_journey') inferred = inferChannelScores(content)
  else if (artifactType === 'positioning_messaging') inferred = inferMessageScores(content)
  else return // not a Patel deliverable

  if (Object.keys(inferred.scores).length === 0) return

  // Upsert: merge new scores with any existing ones (don't overwrite manually-set scores)
  const { data: existing } = await supabase
    .from('patel_diagnostic_scores')
    .select('scores, confidence')
    .eq('user_id', userId)
    .single()

  const mergedScores = { ...(existing?.scores ?? {}), ...inferred.scores }
  const mergedConfidence = { ...(existing?.confidence ?? {}), ...inferred.confidence }

  await supabase
    .from('patel_diagnostic_scores')
    .upsert({
      user_id: userId,
      scores: mergedScores,
      confidence: mergedConfidence,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
}
