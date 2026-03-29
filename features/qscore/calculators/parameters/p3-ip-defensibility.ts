/**
 * Edge Alpha IQ Score v2 — P3: IP / Defensibility
 * 5 indicators: IP Protection, Technical Depth, Know-How Density,
 *               Build Complexity, Replication Barrier (AI flag)
 *
 * rawScore: 1.0–5.0 in 0.5 increments (0 = excluded)
 * Confidence = metadata only, never multiplied into rawScore
 */

import type { AssessmentData, IndicatorScore, ScoreStage } from '../../types/qscore.types'
import type { DataQuality } from '../../types/data-quality.types'

function snap(value: number): number {
  return Math.round(value * 2) / 2
}

function clamp(v: number, min = 1.0, max = 5.0): number {
  return Math.min(max, Math.max(min, v))
}

function _defaultDQ(confidence = 0.6): DataQuality {
  return { source: 'founder_claim', verificationLevel: 'unverified', confidence, reasons: [] }
}

const TECH_DEPTH_RE =
  /\b(algorithm|model|neural|ml|ai|proprietary|patent|copyright|api|architecture|infrastructure|dataset|trained|custom|built.in.?house|first.?party|real.?time|low.?latency|edge|embedded|hardware|chip|sensor|protocol|blockchain|encryption|diffusion)\b/i

const KNOW_HOW_RE =
  /\b(trade.?secret|tacit|expertise|relationships|network|dataset|distribution|exclusive|partnership|license|certification|regulatory.?approval|fda|iso|compliance)\b/i

const BUILD_COMPLEXITY_RE =
  /\b(hard.?to.?replicate|difficult|complex|regulatory|compliance|scale|data.?network|cold.?start|two.?sided|marketplace|integration|enterprise|certification|years.?to.?build|require.?team|require.?data)\b/i

// ── Build complexity string → numeric months ──────────────────────────────────

function buildComplexityToMonths(s: string): number | null {
  if (s.includes('<1') || s.includes('under 1')) return 0.5
  if (s.includes('1-3')) return 2
  if (s.includes('3-6')) return 4.5
  if (s.includes('6-12')) return 9
  if (s.includes('12+') || s.includes('12 months') || s.includes('year')) return 18
  return null
}

// ── Indicators ────────────────────────────────────────────────────────────────

function score_3_1_IPProtection(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p3 = data.p3 ?? {}
  const patentDesc = p3.patentDescription ?? ''
  const hasPatent = p3.hasPatent ?? false

  let raw: number
  if (hasPatent && patentDesc.length >= 50) raw = 5.0
  else if (hasPatent && patentDesc.length > 0) raw = 4.0
  else if (hasPatent) raw = 3.5
  else if (patentDesc.length >= 50) raw = 3.0  // describes IP without formal patent
  else if (data.advantageExplanation?.toLowerCase().includes('patent')) raw = 2.5
  else raw = 1.5  // no IP — still possible other moats

  const dq: DataQuality = {
    source: hasPatent ? 'document' : 'founder_claim',
    verificationLevel: hasPatent && patentDesc.length > 20 ? 'doc_supported' : 'unverified',
    confidence: hasPatent ? (patentDesc.length >= 50 ? 0.85 : 0.65) : 0.45,
    reasons: [
      hasPatent ? 'patent claimed' : 'no patent',
      patentDesc.length >= 50 ? 'description provided' : 'no patent description',
    ],
  }

  return { id: '3.1', name: 'IP Protection', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

function score_3_2_TechnicalDepth(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const techText = data.p3?.technicalDepth ?? data.advantageExplanation ?? ''
  const hasTech = TECH_DEPTH_RE.test(techText)

  let raw: number
  if (!techText || techText.length < 20) raw = 1.0
  else if (!hasTech && techText.length < 60) raw = 1.5
  else if (!hasTech && techText.length >= 60) raw = 2.0
  else if (hasTech && techText.length < 60) raw = 3.0
  else if (hasTech && techText.length < 120) raw = 3.5
  else if (hasTech && techText.length >= 120) raw = 5.0
  else raw = 2.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: hasTech && techText.length >= 120 ? 'doc_supported' : 'unverified',
    confidence: hasTech ? 0.65 : 0.45,
    reasons: [hasTech ? 'technical signals present' : 'no technical depth signals', `length: ${techText.length}`],
  }

  return { id: '3.2', name: 'Technical Depth', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

function score_3_3_KnowHowDensity(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const knowText = data.p3?.knowHowDensity ?? data.problemStory ?? ''
  const hasKnowHow = KNOW_HOW_RE.test(knowText)
  const isSpecific = /\b(\d+\s*years|\d+\s*clients|\d+\s*integrations|\d+\s*customers|enterprise.?grade|production.?ready)\b/i.test(knowText)

  let raw: number
  if (!knowText || knowText.length < 20) raw = 1.0
  else if (!hasKnowHow && knowText.length < 80) raw = 1.5
  else if (!hasKnowHow && knowText.length >= 80) raw = 2.0
  else if (hasKnowHow && !isSpecific) raw = 3.0
  else if (hasKnowHow && isSpecific && knowText.length < 150) raw = 4.0
  else if (hasKnowHow && isSpecific && knowText.length >= 150) raw = 5.0
  else raw = 2.5

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: hasKnowHow && isSpecific ? 'doc_supported' : 'unverified',
    confidence: hasKnowHow ? (isSpecific ? 0.70 : 0.55) : 0.45,
    reasons: [hasKnowHow ? 'know-how signals present' : 'no know-how signals', isSpecific ? 'specific metrics cited' : 'no specific metrics'],
  }

  return { id: '3.3', name: 'Know-How Density', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

function score_3_4_BuildComplexity(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const complexText = data.p3?.buildComplexity ?? data.advantageExplanation ?? ''
  const isComplex = BUILD_COMPLEXITY_RE.test(complexText)
  const complexMonths = buildComplexityToMonths(complexText)
  const buildTime = data.buildTime ?? complexMonths

  let raw: number
  if (buildTime !== null && buildTime !== undefined) {
    if (buildTime < 1) raw = 1.0
    else if (buildTime < 3) raw = 2.0
    else if (buildTime < 6) raw = 3.0
    else if (buildTime < 12) {
      // Within-tier interpolation for mid range
      const pos = (buildTime - 6) / (12 - 6)
      raw = 3.0 + (pos >= 0.5 ? 0.5 : 0)
    }
    else if (buildTime < 18) raw = 4.0
    else raw = 5.0
  } else if (isComplex) {
    raw = stage === 'early' ? 3.0 : 3.5
  } else if (complexText.length >= 100) {
    raw = 2.5
  } else {
    raw = 1.5
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: isComplex ? 'doc_supported' : 'unverified',
    confidence: buildTime !== null ? 0.65 : (isComplex ? 0.55 : 0.40),
    reasons: [
      buildTime !== null ? `build time: ${buildTime}mo` : 'build time not specified',
      isComplex ? 'complexity signals present' : 'no complexity signals',
    ],
  }

  return { id: '3.4', name: 'Build Complexity', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

export function score_3_5_ReplicationBarrier(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const repCost = data.p3?.replicationCostUsd
  const repMonths = (data as AssessmentData & { replicationTimeMonths?: number }).replicationTimeMonths
  const techText = data.p3?.technicalDepth ?? ''
  const complexText = data.p3?.buildComplexity ?? ''

  let raw: number
  if (repCost !== undefined) {
    if (repCost < 50_000) raw = 1.0
    else if (repCost < 200_000) {
      const pos = (repCost - 50_000) / (200_000 - 50_000)
      raw = 1.0 + pos * 2
    }
    else if (repCost < 500_000) raw = 3.0
    else if (repCost < 2_000_000) {
      const pos = (repCost - 500_000) / (2_000_000 - 500_000)
      raw = 3.0 + (pos >= 0.5 ? 0.5 : 0)
    }
    else if (repCost < 5_000_000) raw = 4.0
    else raw = 5.0
  } else if (repMonths !== undefined) {
    if (repMonths < 3) raw = 1.5
    else if (repMonths < 6) raw = 2.5
    else if (repMonths < 12) raw = 3.5
    else if (repMonths < 24) raw = 4.0
    else raw = 5.0
  } else {
    // Infer from technical depth + complexity texts
    const hasTech = TECH_DEPTH_RE.test(techText)
    const isComplex = BUILD_COMPLEXITY_RE.test(complexText)
    if (hasTech && isComplex) raw = 3.5
    else if (hasTech || isComplex) raw = 2.5
    else raw = 1.5
  }

  const dq: DataQuality = {
    source: repCost !== undefined ? 'founder_claim' : 'founder_claim',
    verificationLevel: 'unverified',
    confidence: repCost !== undefined ? 0.60 : 0.45,
    reasons: [
      repCost !== undefined ? `replication cost: $${repCost.toLocaleString()}` : 'replication cost not provided',
      repMonths !== undefined ? `replication time: ${repMonths}mo` : '',
    ].filter(Boolean),
  }

  return {
    id: '3.5', name: 'Replication Barrier',
    rawScore: snap(clamp(raw)),
    excluded: false,
    dataQuality: dq,
    vcAlert: undefined, // set by reconciliation-engine
  }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP3(
  data: AssessmentData,
  stage: ScoreStage
): IndicatorScore[] {
  return [
    score_3_1_IPProtection(data, stage),
    score_3_2_TechnicalDepth(data, stage),
    score_3_3_KnowHowDensity(data, stage),
    score_3_4_BuildComplexity(data, stage),
    score_3_5_ReplicationBarrier(data, stage),
  ]
}

/** @deprecated Use scoreP3() in the IQ Score v2 pipeline */
export function scoreP3IPDefensibility(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const indicators = scoreP3(data, 'mid')
  const sub: Record<string, number> = {}
  let totalRaw = 0
  for (const ind of indicators) {
    const pct = (ind.rawScore / 5) * 20
    sub[ind.id] = Math.round(pct)
    totalRaw += pct
  }
  return { score: Math.round(Math.min(100, totalRaw)), rawPoints: Math.round(totalRaw), maxPoints: 100, sub }
}
