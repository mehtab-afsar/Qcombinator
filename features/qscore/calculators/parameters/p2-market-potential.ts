/**
 * Edge Alpha IQ Score v2 — P2: Market Potential
 * 5 indicators: Market Size (AI flag), Market Urgency, Value Pool,
 *               Expansion Potential, Competitive Space (AI flag)
 *
 * rawScore: 1.0–5.0 in 0.5 increments (0 = excluded; 2.1 and 2.5 are AI-flagged)
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

function defaultDQ(confidence = 0.6): DataQuality {
  return { source: 'founder_claim', verificationLevel: 'unverified', confidence, reasons: [] }
}

const URGENCY_RE =
  /\b(regulation|gdpr|compliance|law|mandate|post.covid|ai.boom|llm|api.available|infrastructure|platform.shift|mobile.first|remote.work|climate|carbon|shortage|labor.shortage|supply.chain|consolidation)\b/i

const EXPANSION_RE =
  /\b(international|global|europe|asia|apac|latam|adjacent|enterprise|smb|mid.market|vertical|horizontal|platform|api|marketplace|white.label|franchise|channel.partner)\b/i

// ── 2.1 Market Size (AI-flagged indicator) ─────────────────────────────────────

export function score_2_1_MarketSize(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const tamText = (data.p2?.tamDescription ?? '').toLowerCase()
  const hasNumber = /\$[\d,.]+[mbt]?|\d+[\s,]*(million|billion|trillion)/.test(tamText)
  const hasReasoning = /\b(because|since|based on|assuming|estimate|research|data|report|ibis|gartner|forrester|bottom.up|sam|som)\b/.test(tamText)
  const isLong = tamText.length >= 80

  // Bottom-up signals: customer count × price decomposition (a16z / Marc Andreessen standard)
  const hasBottomUp = /\b(bottom.up|customers?\s*[×x\*]\s*[\$\d]|[\$\d,]+\s*[×x\*]\s*\d+\s*(customer|user|account|seat|company)|price\s*[×x\*]\s*\d+|sam\s*=|(\d+k?|\d+,\d{3})\s*(companies|customers|users|accounts|smb|enterprise)\s*(paying|at\s*\$|×|\*|times))/i.test(tamText)

  // Top-down-only: single analyst/report figure with no decomposition
  const isTopDownOnly = hasNumber && !hasBottomUp &&
    /\b(market\s+(?:is|was|will be|size|valued)|industry\s+(?:is|worth|valued)|according\s+to|report\s+says|grand\s+view|mordor|statista|idc\s+report|gartner\s+says)\b/i.test(tamText)

  let raw: number
  if (!tamText || tamText.length < 20) {
    raw = 1.0
  } else if (!hasNumber && !hasReasoning) {
    raw = 1.5
  } else if (hasNumber && !hasReasoning) {
    raw = 2.5
  } else if (!hasNumber && hasReasoning) {
    raw = 3.0
  } else if (hasBottomUp && isLong) {
    // Bottom-up with full decomposition — maximum credibility
    raw = 5.0
  } else if (hasBottomUp) {
    // Bottom-up present but narrative thin
    raw = 4.0
  } else if (hasNumber && hasReasoning && !isLong) {
    raw = 3.5
  } else {
    // number + reasoning + long but no bottom-up
    raw = 4.0
  }

  // Cross-validate: implied TAM from targetCustomers × LTV
  if (data.targetCustomers && data.lifetimeValue) {
    const impliedTam = data.targetCustomers * data.lifetimeValue
    const statedMatch = tamText.match(/\$([\d.]+)\s*([mbt])/)
    if (statedMatch) {
      const mult: Record<string, number> = { m: 1e6, b: 1e9, t: 1e12 }
      const statedTam = parseFloat(statedMatch[1]) * (mult[statedMatch[2]] ?? 1e6)
      if (statedTam > impliedTam * 100 && impliedTam > 0) {
        raw = Math.min(raw, 3.0) // cap when >100× implied — classic top-down inflation
      }
    }
  }

  // Cap top-down-only at 3.0 — VCs penalise analyst-report-only TAMs
  if (isTopDownOnly) {
    raw = Math.min(raw, 3.0)
  }

  const dq: DataQuality = {
    source: hasBottomUp ? 'document' : hasReasoning ? 'third_party' : 'founder_claim',
    verificationLevel: hasBottomUp ? 'doc_supported' : hasReasoning ? 'doc_supported' : 'unverified',
    confidence: hasBottomUp ? 0.85 : (hasNumber && hasReasoning) ? 0.70 : 0.50,
    reasons: [
      hasBottomUp ? 'bottom-up calculation present' : isTopDownOnly ? 'top-down only (analyst report)' : 'no bottom-up decomposition',
      hasNumber ? 'TAM number present' : 'no TAM number',
      hasReasoning ? 'reasoning provided' : 'no reasoning/sources',
    ],
  }

  const vcAlert = isTopDownOnly
    ? 'Top-down TAM only — VCs prefer bottom-up: # target customers × average contract value'
    : undefined

  // AI reconciliation note — actual reconciliation happens in reconciliation-engine.ts
  // vcAlert may be overwritten if AI deviation also detected (reconciliation-engine takes precedence)
  return {
    id: '2.1', name: 'Market Size',
    rawScore: snap(clamp(raw)),
    excluded: false,
    dataQuality: dq,
    vcAlert,
  }
}

// ── 2.2 Market Urgency ────────────────────────────────────────────────────────

function score_2_2_MarketUrgency(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const urgencyText = data.p2?.marketUrgency ?? data.problemStory ?? ''
  const hasTrigger = URGENCY_RE.test(urgencyText)
  const isSpecific = urgencyText.length >= 80
  const hasTimeRef = /\b(20(2[3-9]|3[0-9])|last (year|month|quarter)|this year|recently|since 20)\b/i.test(urgencyText)

  let raw: number
  if (!urgencyText || urgencyText.length < 20) raw = 1.0
  else if (!hasTrigger && !isSpecific) raw = 1.5
  else if (!hasTrigger && isSpecific) raw = 2.5
  else if (hasTrigger && !isSpecific) raw = 3.0
  else if (hasTrigger && isSpecific && !hasTimeRef) raw = 3.5
  else raw = 5.0 // trigger + specific + time reference = strongest

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: hasTrigger && isSpecific ? 0.65 : 0.50,
    reasons: [hasTrigger ? 'urgency trigger identified' : 'no concrete trigger', isSpecific ? 'detailed explanation' : 'vague'],
  }

  return { id: '2.2', name: 'Market Urgency', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 2.3 Value Pool ────────────────────────────────────────────────────────────

function score_2_3_ValuePool(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const valueText = data.p2?.valuePool ?? ''
  const hasEcon = /\$[\d,.]+[mbt]?|\d+[\s,]*(million|billion|hour|day|week|year)\b/i.test(valueText)
  const hasWaste = /\b(waste|inefficien|cost|overhead|manual|legacy|broken|friction|loss|churn|down.?time)\b/i.test(valueText)

  let raw: number
  if (!valueText || valueText.length < 20) raw = 1.0
  else if (!hasEcon && !hasWaste) raw = 1.5
  else if (hasWaste && !hasEcon) raw = 2.5
  else if (hasEcon && !hasWaste) raw = 3.0
  else if (hasEcon && hasWaste && valueText.length >= 60) raw = 4.0
  else if (hasEcon && hasWaste && valueText.length >= 80) raw = 5.0
  else raw = 3.5

  const dq: DataQuality = {
    source: hasEcon ? 'third_party' : 'founder_claim',
    verificationLevel: hasEcon ? 'doc_supported' : 'unverified',
    confidence: hasEcon && hasWaste ? 0.70 : 0.50,
    reasons: [hasEcon ? 'economic value quantified' : 'no dollar value', hasWaste ? 'problem framed as cost/waste' : 'no cost framing'],
  }

  return { id: '2.3', name: 'Value Pool', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 2.4 Expansion Potential ────────────────────────────────────────────────────

function score_2_4_ExpansionPotential(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const expansionText = data.p2?.expansionPotential ?? data.advantageExplanation ?? ''
  const hasExpansion = EXPANSION_RE.test(expansionText)
  const hasStages = /\b(phase|step|first|then|next|after|later|eventually|year [23]|series [ab])\b/i.test(expansionText)

  let raw: number
  if (!expansionText || expansionText.length < 20) raw = 1.0
  else if (!hasExpansion) raw = 1.5
  else if (hasExpansion && !hasStages && expansionText.length < 50) raw = 2.5
  else if (hasExpansion && expansionText.length >= 50 && !hasStages) raw = 3.0
  else if (hasExpansion && hasStages && expansionText.length >= 50) raw = 4.0
  else if (hasExpansion && hasStages && expansionText.length >= 80) raw = 5.0
  else raw = 3.0

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: hasExpansion ? 0.65 : 0.45,
    reasons: [hasExpansion ? 'expansion signals present' : 'no expansion narrative', hasStages ? 'phased plan described' : 'no phased roadmap'],
  }

  return { id: '2.4', name: 'Expansion Potential', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 2.5 Competitive Space (AI-flagged indicator) ───────────────────────────────

export function score_2_5_CompetitiveSpace(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const compCount = data.p2?.competitorCount
  const compContext = data.p2?.competitorDensityContext ?? ''
  const hasPositioning = /\b(different|unlike|instead of|better than|unique|niche|whitespace|position|moat|10x)\b/i.test(compContext)
  const hasNamedCompetitors = compContext.length > 30

  let raw: number
  if (compCount === undefined) raw = 2.5 // unknown — partial credit
  else if (compCount === 0 && hasPositioning) raw = 3.5 // greenfield (unproven)
  else if (compCount === 0) raw = 3.0
  else if (compCount <= 3 && hasPositioning && hasNamedCompetitors) raw = 5.0
  else if (compCount <= 3 && hasPositioning) raw = 4.0
  else if (compCount <= 5 && hasPositioning) raw = 3.5
  else if (compCount <= 5) raw = 3.0
  else if (compCount <= 10 && hasPositioning) raw = 2.5
  else if (compCount <= 10) raw = 2.0
  else raw = 1.5 // >10 competitors, crowded

  const dq: DataQuality = {
    source: hasNamedCompetitors ? 'founder_claim' : 'founder_claim',
    verificationLevel: 'unverified',
    confidence: hasNamedCompetitors ? 0.65 : 0.45,
    reasons: [compCount !== undefined ? `${compCount} competitors cited` : 'count unknown', hasNamedCompetitors ? 'named competitors present' : 'no named competitors'],
  }

  return {
    id: '2.5', name: 'Competitive Space',
    rawScore: snap(clamp(raw)),
    excluded: false,
    dataQuality: dq,
    vcAlert: undefined, // set by reconciliation-engine
  }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP2(
  data: AssessmentData,
  stage: ScoreStage
): IndicatorScore[] {
  return [
    score_2_1_MarketSize(data, stage),
    score_2_2_MarketUrgency(data, stage),
    score_2_3_ValuePool(data, stage),
    score_2_4_ExpansionPotential(data, stage),
    score_2_5_CompetitiveSpace(data, stage),
  ]
}

// ── Legacy export (used by prd-aligned-qscore.ts — kept for backward compat) ──
/** @deprecated Use scoreP2() in the new IQ Score v2 pipeline */
export function scoreP2MarketPotential(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const indicators = scoreP2(data, 'mid')
  const sub: Record<string, number> = {}
  let totalRaw = 0
  for (const ind of indicators) {
    const pct = ((ind.rawScore / 5) * 20)
    sub[ind.id] = Math.round(pct)
    totalRaw += pct
  }
  const score = Math.round(Math.min(100, totalRaw))
  return { score, rawPoints: Math.round(totalRaw), maxPoints: 100, sub }
}
