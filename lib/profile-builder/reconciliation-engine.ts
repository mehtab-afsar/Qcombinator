/**
 * Edge Alpha IQ Score v2 — AI Reconciliation Engine
 *
 * CRITICAL INVARIANT:
 *   reconciledValue = founderValue ALWAYS
 *   rawScore is NEVER changed by reconciliation
 *   Only DataQuality.confidence and vcAlert are adjusted
 *
 * 4 AI-flagged indicators:
 *   2.1 Market Size (SAM estimate)
 *   2.5 Competitive Space (competitor density)
 *   3.5 Replication Barrier (replication cost)
 *   5.1 Climate Leverage (climate claim)
 *
 * Error handling: non-blocking. On timeout/error → return { applied: false }
 * Caching: 24h per indicatorId × userId
 */

import { routedText } from '../llm/router'
import {
  getCachedReconciliation,
  setCachedReconciliation,
} from '../cache/qscore-cache'
import type { AssessmentData } from '../../features/qscore/types/qscore.types'

const TIMEOUT_MS = 5000
const ENABLE_RECONCILIATION = process.env.ENABLE_RECONCILIATION !== 'false'

export interface ReconciliationResult {
  indicatorId: string
  founderValue: unknown
  aiEstimate: unknown
  deviation: number | null
  anomalySeverity: 'none' | 'low' | 'high' | 'extreme'
  confidenceAdjustment: number
  vcAlert: string | null
  applied: boolean
  error?: string
}

// ── Deviation tiers ───────────────────────────────────────────────────────────

function assessDeviation(
  founderValue: number,
  aiEstimate: number
): { deviation: number; severity: ReconciliationResult['anomalySeverity']; adjustment: number } {
  if (aiEstimate <= 0) return { deviation: 0, severity: 'none', adjustment: 0 }
  const deviation = Math.abs(founderValue - aiEstimate) / aiEstimate

  if (deviation <= 0.5) return { deviation, severity: 'none', adjustment: 0 }
  if (deviation <= 1.0) return { deviation, severity: 'low', adjustment: -0.10 }
  if (deviation <= 5.0) return { deviation, severity: 'high', adjustment: -0.20 }
  return { deviation, severity: 'extreme', adjustment: -0.30 }
}

// ── LLM prompt templates ──────────────────────────────────────────────────────

function buildPrompt(
  indicatorId: string,
  data: AssessmentData
): { systemPrompt: string; userContent: string } | null {
  const p2 = data.p2 ?? {}
  const p3 = data.p3 ?? {}
  const p5 = data.p5 ?? {}

  switch (indicatorId) {
    case '2.1':
      return {
        systemPrompt: `You are a VC analyst fact-checking a founder's SAM estimate.
Given the product description and stated TAM/SAM, provide your own estimate of the realistic SAM.
Return ONLY valid JSON: { "aiSamUsd": number, "reasoning": "string", "confidence": number }
Do not invent data. If insufficient info, return { "aiSamUsd": null, "reasoning": "insufficient data", "confidence": 0 }`,
        userContent: `Product: ${data.problemStory ?? 'Not provided'}
Customer type: ${data.customerType ?? 'Not provided'}
Stated TAM/SAM: ${p2.tamDescription ?? 'Not provided'}
Target customers: ${data.targetCustomers ?? 'Not provided'}
LTV: ${data.lifetimeValue ?? 'Not provided'}`,
      }

    case '2.5':
      return {
        systemPrompt: `You are a competitive intelligence analyst. Based on the product description, estimate the realistic number of direct competitors.
Return ONLY valid JSON: { "estimatedCompetitors": number, "reasoning": "string", "confidence": number }
Direct competitors only (not adjacent or potential). If market is truly novel, return 0.`,
        userContent: `Product: ${data.problemStory ?? 'Not provided'}
Customer segment: ${data.customerType ?? 'Not provided'}
Founder's stated competitors: ${p2.competitorCount ?? 'Unknown'}
Context: ${p2.competitorDensityContext ?? 'Not provided'}`,
      }

    case '3.5':
      return {
        systemPrompt: `You are a technical due diligence analyst. Estimate the cost in USD for a well-funded team to replicate this product from scratch.
Return ONLY valid JSON: { "estimatedCostUsd": number, "reasoning": "string", "confidence": number }
Consider team size, time, data requirements, infrastructure. Return null if insufficient info.`,
        userContent: `Product: ${data.problemStory ?? 'Not provided'}
Technical depth: ${p3.technicalDepth ?? 'Not provided'}
Build complexity: ${p3.buildComplexity ?? 'Not provided'}
Founder's estimate: ${p3.replicationCostUsd ?? 'Not provided'}
Build time: ${data.buildTime ?? 'Not provided'} months`,
      }

    case '5.1':
      return {
        systemPrompt: `You are a climate impact analyst. Assess whether this startup's climate claim is credible and proportionate.
Return ONLY valid JSON: { "claimIsCredible": boolean, "credibilityScore": number, "reasoning": "string", "redFlags": ["string"] }
credibilityScore: 0.0–1.0. Flag greenwashing (vague claims with no measurability).`,
        userContent: `Product: ${data.problemStory ?? 'Not provided'}
Climate claim: ${p5.climateLeverage ?? 'Not provided'}
Revenue model: ${data.customerType ?? 'Not provided'}`,
      }

    default:
      return null
  }
}

// ── Single indicator reconciliation ──────────────────────────────────────────

async function reconcileOne(
  indicatorId: string,
  data: AssessmentData,
  userId: string
): Promise<ReconciliationResult> {
  // Check cache first
  const cached = getCachedReconciliation<ReconciliationResult>(indicatorId, userId)
  if (cached) return { ...cached, applied: true }

  const prompt = buildPrompt(indicatorId, data)
  if (!prompt) {
    return {
      indicatorId, founderValue: null, aiEstimate: null,
      deviation: null, anomalySeverity: 'none',
      confidenceAdjustment: 0, vcAlert: null, applied: false,
    }
  }

  try {
    const raw = await Promise.race([
      routedText('reasoning',
        [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userContent },
        ],
        { maxTokens: 300, temperature: 0 }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      ),
    ])

    const jsonMatch = (raw as string).match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('no JSON in response')

    const parsed = JSON.parse(jsonMatch[0])

    let result: ReconciliationResult = {
      indicatorId,
      founderValue: getFounderValue(indicatorId, data),
      aiEstimate: null,
      deviation: null,
      anomalySeverity: 'none',
      confidenceAdjustment: 0,
      vcAlert: null,
      applied: true,
    }

    // Extract AI estimate per indicator type
    if (indicatorId === '2.1' && parsed.aiSamUsd != null) {
      const founder = data.targetCustomers && data.lifetimeValue
        ? data.targetCustomers * data.lifetimeValue : null
      if (founder && parsed.aiSamUsd) {
        const { deviation, severity, adjustment } = assessDeviation(founder, parsed.aiSamUsd)
        result = {
          ...result,
          aiEstimate: parsed.aiSamUsd,
          deviation,
          anomalySeverity: severity,
          confidenceAdjustment: adjustment,
          vcAlert: severity === 'extreme'
            ? `Extreme SAM claim: founder ${founder.toLocaleString()} vs AI estimate ${parsed.aiSamUsd.toLocaleString()}`
            : severity === 'high'
            ? `Large SAM deviation: ${Math.round(deviation * 100)}% vs AI estimate`
            : null,
        }
      }
    }

    if (indicatorId === '2.5' && parsed.estimatedCompetitors != null) {
      const founderCount = data.p2?.competitorCount ?? null
      if (founderCount != null) {
        const { deviation, severity, adjustment } = assessDeviation(founderCount, parsed.estimatedCompetitors)
        result = {
          ...result,
          aiEstimate: parsed.estimatedCompetitors,
          deviation,
          anomalySeverity: severity,
          confidenceAdjustment: adjustment,
          vcAlert: severity !== 'none'
            ? `Competitor count: founder says ${founderCount}, AI estimates ${parsed.estimatedCompetitors}`
            : null,
        }
      }
    }

    if (indicatorId === '3.5' && parsed.estimatedCostUsd != null) {
      const founderCost = data.p3?.replicationCostUsd ?? null
      if (founderCost != null) {
        const { deviation, severity, adjustment } = assessDeviation(founderCost, parsed.estimatedCostUsd)
        result = {
          ...result,
          aiEstimate: parsed.estimatedCostUsd,
          deviation,
          anomalySeverity: severity,
          confidenceAdjustment: adjustment,
          vcAlert: severity !== 'none'
            ? `Replication cost: founder says $${founderCost.toLocaleString()}, AI estimates $${parsed.estimatedCostUsd.toLocaleString()}`
            : null,
        }
      }
    }

    if (indicatorId === '5.1') {
      const isCredible = parsed.claimIsCredible ?? true
      const credScore = parsed.credibilityScore ?? 0.7
      if (!isCredible || credScore < 0.5) {
        result = {
          ...result,
          aiEstimate: { credible: isCredible, score: credScore },
          deviation: null,
          anomalySeverity: credScore < 0.3 ? 'extreme' : 'high',
          confidenceAdjustment: credScore < 0.3 ? -0.30 : -0.15,
          vcAlert: `Climate claim credibility: ${Math.round(credScore * 100)}%. ${(parsed.redFlags ?? []).join('; ')}`,
        }
      }
    }

    // Cache the result for 24 hours
    setCachedReconciliation(indicatorId, userId, result)
    return result

  } catch (err) {
    return {
      indicatorId,
      founderValue: getFounderValue(indicatorId, data),
      aiEstimate: null,
      deviation: null,
      anomalySeverity: 'none',
      confidenceAdjustment: 0,
      vcAlert: null,
      applied: false,
      error: err instanceof Error ? err.message : 'unknown error',
    }
  }
}

function getFounderValue(indicatorId: string, data: AssessmentData): unknown {
  switch (indicatorId) {
    case '2.1': return data.targetCustomers && data.lifetimeValue ? data.targetCustomers * data.lifetimeValue : null
    case '2.5': return data.p2?.competitorCount ?? null
    case '3.5': return data.p3?.replicationCostUsd ?? null
    case '5.1': return data.p5?.climateLeverage ?? null
    default: return null
  }
}

// ── Run all 4 reconciliation calls ────────────────────────────────────────────

export async function reconcileIndicators(
  data: AssessmentData,
  userId: string
): Promise<ReconciliationResult[]> {
  if (!ENABLE_RECONCILIATION) return []

  // Run all 4 in parallel — non-blocking on individual failures
  const results = await Promise.allSettled([
    reconcileOne('2.1', data, userId),
    reconcileOne('2.5', data, userId),
    reconcileOne('3.5', data, userId),
    reconcileOne('5.1', data, userId),
  ])

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    const ids = ['2.1', '2.5', '3.5', '5.1']
    return {
      indicatorId: ids[i],
      founderValue: null,
      aiEstimate: null,
      deviation: null,
      anomalySeverity: 'none' as const,
      confidenceAdjustment: 0,
      vcAlert: null,
      applied: false,
      error: r.reason?.message ?? 'promise rejected',
    }
  })
}

// ── Apply reconciliation flags to indicator scores ────────────────────────────

import type { IndicatorScore } from '../../features/qscore/types/qscore.types'

export function applyReconciliationFlags(
  indicators: IndicatorScore[],
  results: ReconciliationResult[]
): IndicatorScore[] {
  const resultMap = new Map(results.map(r => [r.indicatorId, r]))

  return indicators.map(ind => {
    const rec = resultMap.get(ind.id)
    if (!rec || !rec.applied) return ind

    // vcAlert only — rawScore is NEVER changed
    const updatedDQ = {
      ...ind.dataQuality,
      confidence: Math.min(1.0, Math.max(0.0, ind.dataQuality.confidence + rec.confidenceAdjustment)),
      reasons: [...ind.dataQuality.reasons, rec.vcAlert ? `AI flag: ${rec.anomalySeverity}` : ''].filter(Boolean),
    }

    return { ...ind, dataQuality: updatedDQ, vcAlert: rec.vcAlert ?? undefined }
  })
}
