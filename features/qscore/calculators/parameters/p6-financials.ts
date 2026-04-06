/**
 * Edge Alpha IQ Score v2 — P6: Financials
 * 5 indicators: Revenue Scale, Burn Efficiency, Runway,
 *               Unit Economics, Gross Margin
 *
 * Explicit exclusion rules by stage — excluded rawScore=0, still in denominator.
 * rawScore: 1.0–5.0 in 0.5 increments (0 = excluded)
 */

import type { AssessmentData, IndicatorScore, ScoreStage } from '../../types/qscore.types'
import type { DataQuality } from '../../types/data-quality.types'

function snap(value: number): number {
  return Math.round(value * 2) / 2
}

function clamp(v: number, min = 1.0, max = 5.0): number {
  return Math.min(max, Math.max(min, v))
}

function interpolate(value: number, tierMin: number, tierMax: number, baseScore: number): number {
  const pos = (value - tierMin) / (tierMax - tierMin)
  return baseScore + (pos >= 0.5 ? 0.5 : 0)
}

// ── P6 exclusion rules ────────────────────────────────────────────────────────

export function getP6Exclusions(stage: ScoreStage, data: AssessmentData): Set<string> {
  const excl = new Set<string>()

  // Pre-product / idea → exclude all P6
  if (stage === 'early') {
    excl.add('6.1').add('6.2').add('6.3').add('6.4').add('6.5')
    return excl
  }

  const mrr = data.financial?.mrr ?? 0
  const monthlyBurn = data.financial?.monthlyBurn ?? 0
  const hasPayingCustomers = (data as AssessmentData & { hasPayingCustomers?: boolean }).hasPayingCustomers ?? false
  const conversationCount = data.conversationCount ?? 0
  const cogs = data.financial?.cogs
  const averageDealSize = data.financial?.averageDealSize

  // Pre-revenue mid-stage (MRR < $1K)
  if (stage === 'mid' && mrr < 1000) {
    excl.add('6.1')  // Revenue Scale
    excl.add('6.4')  // Unit Economics
    excl.add('6.5')  // Gross Margin
    // 6.3 Runway kept (even pre-revenue founder can have runway)
  }

  // Burn Efficiency: requires both MRR and burn data
  if (!mrr || !monthlyBurn) excl.add('6.2')

  // Unit Economics: requires 10+ customers (meaningful LTV/CAC signal)
  if (!hasPayingCustomers || conversationCount < 10) excl.add('6.4')

  // Gross Margin: requires COGS, deal size, OR an MRR signal (pure SaaS → 80% default)
  if (!cogs && !averageDealSize && !mrr) excl.add('6.5')

  return excl
}

// ── 6.1 Revenue Scale ─────────────────────────────────────────────────────────

function score_6_1_RevenueScale(data: AssessmentData, stage: ScoreStage, excluded: boolean): IndicatorScore {
  if (excluded) {
    return {
      id: '6.1', name: 'Revenue Scale', rawScore: 0, excluded: true,
      exclusionReason: stage === 'early' ? 'pre-product stage' : 'pre-revenue (MRR < $1K)',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
    }
  }

  const mrr = data.financial?.mrr ?? 0
  const arr = data.financial?.arr ?? mrr * 12

  let raw: number
  if (stage === 'mid') {
    if (arr < 10_000) raw = 1.0
    else if (arr < 50_000) {
      raw = interpolate(arr, 10_000, 50_000, 1.0)
    }
    else if (arr < 100_000) raw = 2.5
    else if (arr < 250_000) {
      raw = interpolate(arr, 100_000, 250_000, 3.0)
    }
    else if (arr < 500_000) raw = 4.0
    else raw = 5.0
  } else {  // growth
    if (arr < 500_000) raw = 1.5
    else if (arr < 1_000_000) raw = 2.5
    else if (arr < 5_000_000) {
      raw = interpolate(arr, 1_000_000, 5_000_000, 3.0)
    }
    else if (arr < 10_000_000) raw = 4.0
    else raw = 5.0
  }

  const dq: DataQuality = {
    source: mrr > 0 ? 'api_verified' : 'founder_claim',
    verificationLevel: mrr > 0 ? 'verified' : 'unverified',
    confidence: mrr > 0 ? 0.90 : 0.55,
    reasons: [mrr > 0 ? `MRR: $${mrr.toLocaleString()}` : 'MRR not provided'],
  }

  return { id: '6.1', name: 'Revenue Scale', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 6.2 Burn Efficiency ───────────────────────────────────────────────────────

function score_6_2_BurnEfficiency(data: AssessmentData, stage: ScoreStage, excluded: boolean): IndicatorScore {
  if (excluded) {
    return {
      id: '6.2', name: 'Burn Efficiency', rawScore: 0, excluded: true,
      exclusionReason: 'no MRR+burn data',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
    }
  }

  const mrr = data.financial?.mrr ?? 0
  const burn = data.financial?.monthlyBurn ?? 0
  const burnMultiple = burn > 0 ? burn / Math.max(mrr, 1) : 99

  let raw: number
  if (stage === 'mid') {
    if (burnMultiple > 10) raw = 1.0
    else if (burnMultiple > 5) raw = 1.5
    else if (burnMultiple > 3) raw = 2.5
    else if (burnMultiple > 2) raw = 3.0
    else if (burnMultiple > 1) raw = 3.5
    else if (burnMultiple <= 1) raw = 5.0  // revenue covers burn
    else raw = 2.0
  } else {  // growth
    if (burnMultiple > 5) raw = 1.0
    else if (burnMultiple > 3) raw = 2.0
    else if (burnMultiple > 2) raw = 2.5
    else if (burnMultiple > 1) raw = 3.5
    else if (burnMultiple <= 0.5) raw = 5.0  // profitable
    else raw = 4.0
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'doc_supported',
    confidence: 0.70,
    reasons: [`burn multiple: ${burnMultiple.toFixed(1)}x`],
  }

  return { id: '6.2', name: 'Burn Efficiency', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 6.3 Runway ────────────────────────────────────────────────────────────────

function score_6_3_Runway(data: AssessmentData, _stage: ScoreStage, excluded: boolean): IndicatorScore {
  if (excluded) {
    return {
      id: '6.3', name: 'Runway', rawScore: 0, excluded: true,
      exclusionReason: 'pre-product stage',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
    }
  }

  const runway = data.financial?.runway
  const burn = data.financial?.monthlyBurn
  // Compute if not provided
  const runwayMonths = runway ?? (
    burn && burn > 0 && data.financial?.arr
      ? Math.round((data.financial.arr / 12 * 18) / burn)  // estimate 18mo cash from ARR×1.5
      : undefined
  )

  let raw: number
  if (runwayMonths === undefined) raw = 2.0  // unknown — give neutral
  else if (runwayMonths < 3) raw = 1.0
  else if (runwayMonths < 6) {
    raw = interpolate(runwayMonths, 3, 6, 1.0)
  }
  else if (runwayMonths < 12) raw = 3.0
  else if (runwayMonths < 18) {
    raw = interpolate(runwayMonths, 12, 18, 3.0)
  }
  else if (runwayMonths < 24) raw = 4.0
  else raw = 5.0  // 24+ months is strong

  const dq: DataQuality = {
    source: runway !== undefined ? 'founder_claim' : 'founder_claim',
    verificationLevel: runway !== undefined ? 'doc_supported' : 'unverified',
    confidence: runway !== undefined ? 0.70 : 0.45,
    reasons: [runwayMonths !== undefined ? `runway: ${runwayMonths}mo` : 'runway not provided'],
  }

  return { id: '6.3', name: 'Runway', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 6.4 Unit Economics ────────────────────────────────────────────────────────

function score_6_4_UnitEconomics(data: AssessmentData, stage: ScoreStage, excluded: boolean): IndicatorScore {
  if (excluded) {
    return {
      id: '6.4', name: 'Unit Economics', rawScore: 0, excluded: true,
      exclusionReason: 'fewer than 10 paying customers',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
    }
  }

  const ltv = data.lifetimeValue
  const cac = data.costPerAcquisition
  const ltvCac = (ltv && cac && cac > 0) ? ltv / cac : undefined

  let raw: number
  if (ltvCac === undefined) {
    // Fallback: infer from average deal and sales cycle
    const deal = data.financial?.averageDealSize
    if (!deal) raw = 2.0
    else if (stage === 'mid' && deal < 1000) raw = 2.0
    else if (stage === 'mid' && deal < 10000) raw = 3.0
    else if (deal >= 10000) raw = 4.0
    else raw = 2.5
  } else {
    if (ltvCac < 1) raw = 1.0
    else if (ltvCac < 2) raw = 2.0
    else if (ltvCac < 3) {
      raw = interpolate(ltvCac, 2, 3, 2.0)
    }
    else if (ltvCac < 5) raw = 3.5
    else if (ltvCac < 8) raw = 4.5
    else raw = 5.0
  }

  const dq: DataQuality = {
    source: ltvCac !== undefined ? 'founder_claim' : 'founder_claim',
    verificationLevel: ltvCac !== undefined ? 'doc_supported' : 'unverified',
    confidence: ltvCac !== undefined ? 0.65 : 0.45,
    reasons: [ltvCac !== undefined ? `LTV/CAC: ${ltvCac.toFixed(1)}x` : 'LTV/CAC not provided'],
  }

  return { id: '6.4', name: 'Unit Economics', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 6.5 Gross Margin ─────────────────────────────────────────────────────────

function score_6_5_GrossMargin(data: AssessmentData, _stage: ScoreStage, excluded: boolean): IndicatorScore {
  if (excluded) {
    return {
      id: '6.5', name: 'Gross Margin', rawScore: 0, excluded: true,
      exclusionReason: 'no COGS or deal size data',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0, reasons: [] },
    }
  }

  const mrr = data.financial?.mrr ?? 0
  const rawCogs = data.financial?.cogs
  // When COGS is absent but MRR exists, apply 80% SaaS default (common for pure-software products)
  const cogs = rawCogs ?? (mrr > 0 ? mrr * 0.20 : 0)
  const grossMargin = mrr > 0 ? (mrr - cogs) / mrr : undefined
  const usedSaasDefault = rawCogs === undefined && mrr > 0

  let raw: number
  if (grossMargin === undefined || grossMargin === null) raw = 2.0
  else if (grossMargin < 0) raw = 1.0
  else if (grossMargin < 0.20) raw = 1.5
  else if (grossMargin < 0.40) {
    raw = interpolate(grossMargin, 0.20, 0.40, 1.5)
  }
  else if (grossMargin < 0.60) raw = 3.0
  else if (grossMargin < 0.75) {
    raw = interpolate(grossMargin, 0.60, 0.75, 3.0)
  }
  else if (grossMargin < 0.85) raw = 4.0
  else raw = 5.0  // >85% is SaaS-tier

  const dq: DataQuality = {
    source: usedSaasDefault ? 'founder_claim' : 'founder_claim',
    verificationLevel: usedSaasDefault ? 'unverified' : grossMargin !== undefined ? 'doc_supported' : 'unverified',
    confidence: usedSaasDefault ? 0.50 : grossMargin !== undefined ? 0.65 : 0.45,
    reasons: [
      usedSaasDefault
        ? `GM: 80% (SaaS default — no COGS provided; add COGS to improve accuracy)`
        : grossMargin !== undefined
          ? `GM: ${Math.round((grossMargin ?? 0) * 100)}%`
          : 'gross margin not provided',
    ],
  }

  return { id: '6.5', name: 'Gross Margin', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP6(
  data: AssessmentData,
  stage: ScoreStage
): IndicatorScore[] {
  const exclusions = getP6Exclusions(stage, data)

  return [
    score_6_1_RevenueScale(data, stage, exclusions.has('6.1')),
    score_6_2_BurnEfficiency(data, stage, exclusions.has('6.2')),
    score_6_3_Runway(data, stage, exclusions.has('6.3')),
    score_6_4_UnitEconomics(data, stage, exclusions.has('6.4')),
    score_6_5_GrossMargin(data, stage, exclusions.has('6.5')),
  ]
}
