/**
 * Edge Alpha IQ Score v2 — P5: Structural Impact
 * 5 indicators: Climate Leverage (AI flag), Resource Efficiency,
 *               Development Relevance, Business Model Alignment, Strategic Relevance
 *
 * Commercial track → all 5 indicators rawScore=0 (excluded from numerator)
 * Denominator always 150 regardless.
 * Impact track → all 5 indicators scored normally.
 *
 * rawScore: 1.0–5.0 in 0.5 increments (0 = excluded)
 */

import type { AssessmentData, IndicatorScore, ScoreStage, StartupTrack } from '../../types/qscore.types'
import type { DataQuality } from '../../types/data-quality.types'

function snap(value: number): number {
  return Math.round(value * 2) / 2
}

function clamp(v: number, min = 1.0, max = 5.0): number {
  return Math.min(max, Math.max(min, v))
}

function excludedIndicator(id: string, name: string): IndicatorScore {
  return {
    id, name, rawScore: 0, excluded: true,
    exclusionReason: 'commercial track — P5 not scored',
    dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
  }
}

// ── 5.1 Climate Leverage (AI-flagged) ────────────────────────────────────────

function score_5_1_ClimateLeverage(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p5 = data.p5 ?? {}
  const text = p5.climateLeverage ?? ''

  let raw: number
  if (!text || text.length < 20) raw = 1.0
  else if (text.match(/no.*climate|commercial|not.*impact/i)) raw = 1.0
  else if (text.length < 60) raw = 2.0
  else if (text.match(/carbon|co2|emission|renewable|clean|net.?zero|sustainability/i) && text.length >= 60) raw = 3.5
  else if (text.match(/measur|quantif|ton|kg|baseline|reduction|offset/i)) raw = 4.5
  else raw = 2.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: text.match(/third.party|certif|verif|audit/i) ? 'doc_supported' : 'unverified',
    confidence: text.length >= 80 ? 0.65 : 0.45,
    reasons: [text.length >= 80 ? 'detailed climate claim' : 'vague climate claim'],
  }

  return {
    id: '5.1', name: 'Climate Leverage',
    rawScore: snap(clamp(raw)), excluded: false,
    dataQuality: dq,
    vcAlert: undefined, // set by reconciliation-engine
  }
}

// ── 5.2 Resource Efficiency ───────────────────────────────────────────────────

function score_5_2_ResourceEfficiency(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p5 = data.p5 ?? {}
  const text = p5.socialImpact ?? (p5 as typeof p5 & { resourceEfficiency?: string }).resourceEfficiency ?? ''

  let raw: number
  if (!text || text.length < 20) raw = 1.0
  else if (text.match(/efficient|optimize|waste.reduc|circular|reuse|recycl/i) && text.length >= 60) raw = 3.5
  else if (text.match(/\d+.*%.*efficien|\d+x.*better|industry.?baseline/i)) raw = 4.5
  else if (text.length >= 60) raw = 2.5
  else raw = 1.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: text.length >= 60 ? 0.60 : 0.40,
    reasons: [text.length >= 60 ? 'resource efficiency described' : 'no efficiency evidence'],
  }

  return { id: '5.2', name: 'Resource Efficiency', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 5.3 Development Relevance ─────────────────────────────────────────────────

function score_5_3_DevelopmentRelevance(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p5 = data.p5 ?? {}
  const text = p5.revenueImpactLink ?? (p5 as typeof p5 & { developmentRelevance?: string }).developmentRelevance ?? ''

  let raw: number
  if (!text || text.length < 20) raw = 1.0
  else if (text.match(/sdg|un goal|development|poverty|equality|health|education|sanitation/i) && text.length >= 60) raw = 3.5
  else if (text.match(/direct.*impact|material.*sdg|\d+.*sdg/i)) raw = 4.5
  else if (text.length >= 60) raw = 2.5
  else raw = 1.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: text.length >= 60 ? 0.60 : 0.40,
    reasons: [text.match(/sdg/i) ? 'SDG alignment mentioned' : 'no SDG framing'],
  }

  return { id: '5.3', name: 'Development Relevance', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 5.4 Business Model Alignment ─────────────────────────────────────────────

function score_5_4_BusinessModelAlignment(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p5 = data.p5 ?? {}
  const text = p5.scalingMechanism ?? (p5 as typeof p5 & { businessModelAlignment?: string }).businessModelAlignment ?? ''

  let raw: number
  if (!text || text.length < 20) raw = 1.0
  else if (text.match(/revenue.*impact|impact.*revenue|aligned|integrated|core.?to.?business/i) && text.length >= 60) raw = 4.0
  else if (text.match(/>75%|primary|all revenue|every.*dollar/i)) raw = 5.0
  else if (text.match(/partial|some|side|secondary/i)) raw = 2.5
  else if (text.length >= 60) raw = 2.0
  else raw = 1.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: text.length >= 60 ? 0.65 : 0.45,
    reasons: [text.match(/revenue.*impact/i) ? 'revenue-impact link described' : 'no clear link between revenue and impact'],
  }

  return { id: '5.4', name: 'Business Model Alignment', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 5.5 Strategic Relevance ───────────────────────────────────────────────────

function score_5_5_StrategicRelevance(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p5 = data.p5 ?? {}
  const text = p5.viksitBharatAlignment ?? (p5 as typeof p5 & { strategicRelevance?: string }).strategicRelevance ?? ''

  // Viksit Bharat 2047 strategic domains
  const strategicDomains = /\b(semiconductor|defence|defense|clean energy|food|agri|healthcare|infrastructure|space|fintech|digital|atmanirbhar|make.?in.?india|india.?stack)\b/i

  let raw: number
  if (!text || text.length < 20) raw = 1.0
  else if (!strategicDomains.test(text)) raw = 1.5
  else if (strategicDomains.test(text) && text.length < 60) raw = 2.5
  else if (strategicDomains.test(text) && text.length >= 60) {
    const domainMatches = (text.match(strategicDomains) ?? []).length
    raw = domainMatches >= 2 ? 5.0 : 3.5
  }
  else raw = 2.0

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: text.length >= 60 ? 0.65 : 0.45,
    reasons: [strategicDomains.test(text) ? 'strategic domain alignment present' : 'no strategic domain alignment'],
  }

  return { id: '5.5', name: 'Strategic Relevance', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP5(
  data: AssessmentData,
  stage: ScoreStage,
  track: StartupTrack
): IndicatorScore[] {
  if (track === 'commercial') {
    // Commercial track: all P5 rawScore=0, still in denominator (150 stays constant)
    return [
      excludedIndicator('5.1', 'Climate Leverage'),
      excludedIndicator('5.2', 'Resource Efficiency'),
      excludedIndicator('5.3', 'Development Relevance'),
      excludedIndicator('5.4', 'Business Model Alignment'),
      excludedIndicator('5.5', 'Strategic Relevance'),
    ]
  }

  return [
    score_5_1_ClimateLeverage(data, stage),
    score_5_2_ResourceEfficiency(data, stage),
    score_5_3_DevelopmentRelevance(data, stage),
    score_5_4_BusinessModelAlignment(data, stage),
    score_5_5_StrategicRelevance(data, stage),
  ]
}

/** Determine track from founder profile data */
export function determineTrack(data: AssessmentData, isImpactFocused?: boolean): StartupTrack {
  if (isImpactFocused) return 'impact'
  const p5 = data.p5 ?? {}
  const hasImpact = Object.values(p5).some(v => typeof v === 'string' && v.length > 20)
  return hasImpact ? 'impact' : 'commercial'
}
