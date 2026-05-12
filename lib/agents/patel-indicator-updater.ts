/**
 * Patel Indicator Updater
 * Infers GTM indicator scores from completed D1–D4 artifact content and upserts to patel_diagnostic_scores.
 * Called after Patel deliverable saves in generate/run/route.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IndicatorScore, PatelScores, PatelConfidence } from '@/lib/constants/patel-indicators'

function clamp(n: number): IndicatorScore {
  return Math.max(1, Math.min(5, Math.round(n))) as IndicatorScore
}

function inferIcpScores(content: Record<string, unknown>): { scores: PatelScores; confidence: PatelConfidence } {
  const scores: PatelScores = {}
  const confidence: PatelConfidence = {}

  const persona = content.buyerPersona as Record<string, unknown> | undefined
  const firm = content.firmographics as Record<string, unknown> | undefined
  const pains = (content.painPoints as unknown[]) ?? []
  const channels = (content.channels as unknown[]) ?? []
  const qual = (content.qualificationCriteria as unknown[]) ?? []
  const evType = content.evidence_type as string | undefined
  const conf = Number(content.confidence ?? 0)

  // icp.specificity — based on how many specific fields are populated
  if (persona && firm) {
    const traitCount = [persona.title, persona.role, persona.seniority, persona.dayInLife].filter(Boolean).length
    const firmCount = [firm.companySize, firm.industry, firm.revenue, firm.geography].filter(Boolean).length
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
  const highPains = pains.filter((p: unknown) => (p as Record<string, unknown>)?.severity === 'high').length
  if (highPains > 0 || evType === 'validated') {
    scores['icp.commercial_alignment'] = evType === 'validated' ? clamp(3 + highPains) : 2
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

export async function updatePatelIndicatorsFromArtifact(
  userId: string,
  artifactType: string,
  content: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  let inferred: { scores: PatelScores; confidence: PatelConfidence } = { scores: {}, confidence: {} }

  if (artifactType === 'icp_document') inferred = inferIcpScores(content)
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
