/**
 * Edge Alpha IQ Score v2 — Confidence Engine
 *
 * Enriches AssessmentData with DataQuality metadata per field.
 * NEVER modifies rawScore. Returns DataQuality map only.
 *
 * Source base confidence:
 *   Stripe API: 0.95 | spreadsheet: 0.85 | pitch deck: 0.70
 *   third-party report: 0.90 | chat: 0.60 | document non-financial: 0.80
 *
 * Adjustments (never push above 1.0 or below 0.0):
 *   specificity:          +0.05
 *   vagueness:            -0.10
 *   cross-source conflict:-0.15
 *   cross-source agree:   +0.05
 *   data age >12 months:  -0.05
 */

import type { DataQuality, DataSource, VerificationLevel } from '../../features/qscore/types/data-quality.types'
import type { AssessmentData, DataSourceMap } from '../../features/qscore/types/qscore.types'

export type DataQualityMap = Record<string, DataQuality>

// ── Source base confidence ────────────────────────────────────────────────────

const SOURCE_BASE: Record<string, number> = {
  stripe:        0.95,
  spreadsheet:   0.85,
  third_party:   0.90,
  pitch_deck:    0.70,
  doc_financial: 0.85,
  doc_other:     0.80,
  chat:          0.60,
  founder_claim: 0.60,
}

function clampConfidence(v: number): number {
  return Math.min(1.0, Math.max(0.0, v))
}

// ── Determine DataSource type for a given field ───────────────────────────────

function getDataSource(
  field: string,
  dataSourceMap?: DataSourceMap
): { source: DataSource; verificationLevel: VerificationLevel; base: number } {
  const mapped = dataSourceMap?.[field as keyof DataSourceMap]
  if (mapped === 'stripe') {
    return { source: 'api_verified', verificationLevel: 'verified', base: SOURCE_BASE['stripe'] }
  }
  if (mapped === 'document') {
    return { source: 'document', verificationLevel: 'doc_supported', base: SOURCE_BASE['doc_financial'] }
  }
  return { source: 'founder_claim', verificationLevel: 'unverified', base: SOURCE_BASE['chat'] }
}

// ── Specificity detector ──────────────────────────────────────────────────────

function isSpecific(value: unknown): boolean {
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    return (
      /\$[\d,.]+|\d+\s*(months?|years?|customers?|users?|companies?)|\d+%/.test(value) ||
      value.length >= 80
    )
  }
  return false
}

function isVague(value: unknown): boolean {
  if (typeof value === 'string') {
    return (
      /\b(maybe|possibly|roughly|around|approximately|some|several|many|few|various|estimated)\b/i.test(value) &&
      value.length < 60
    )
  }
  return false
}

// ── Main enrichment function ──────────────────────────────────────────────────

export function enrichDataQuality(
  data: AssessmentData
): DataQualityMap {
  const map: DataQualityMap = {}
  const dsMap = data.dataSourceMap ?? {}

  // Financial fields
  const financialFields = ['mrr', 'arr', 'monthlyBurn', 'runway', 'cogs', 'averageDealSize'] as const
  for (const field of financialFields) {
    const value = data.financial?.[field]
    if (value === undefined) continue

    const { source, verificationLevel, base } = getDataSource(field, dsMap)
    let confidence = base
    const reasons: string[] = [`source: ${source}`]

    if (isSpecific(value)) {
      confidence = clampConfidence(confidence + 0.05)
      reasons.push('specific value')
    }
    if (isVague(String(value))) {
      confidence = clampConfidence(confidence - 0.10)
      reasons.push('vague')
    }

    map[`financial.${field}`] = { source, verificationLevel, confidence, reasons }
  }

  // Customer evidence fields
  const customerFields = [
    ['conversationCount',   data.conversationCount],
    ['customerCommitment',  data.customerCommitment],
    ['hasPayingCustomers',  data.hasPayingCustomers],
    ['largestContractUsd',  (data as AssessmentData & { largestContractUsd?: number }).largestContractUsd],
  ] as const

  for (const [field, value] of customerFields) {
    if (value === undefined || value === null) continue
    const { source, verificationLevel, base } = getDataSource(field, dsMap)
    let confidence = base
    const reasons: string[] = [`source: ${source}`]

    if (isSpecific(value)) {
      confidence = clampConfidence(confidence + 0.05)
      reasons.push('specific')
    }
    if (data.customerList && data.customerList.length > 0) {
      confidence = clampConfidence(confidence + 0.05)
      reasons.push('named customers')
    }
    if (data.customerCommitment?.match(/signed|loi|contract/i)) {
      confidence = clampConfidence(confidence + 0.05)
      reasons.push('signed agreement mentioned')
    }

    map[field] = { source, verificationLevel, confidence, reasons }
  }

  // P3 IP fields
  if (data.p3?.hasPatent) {
    const base = data.p3.patentDescription ? SOURCE_BASE['doc_other'] : SOURCE_BASE['chat']
    map['p3.hasPatent'] = {
      source: 'document',
      verificationLevel: data.p3.patentDescription ? 'doc_supported' : 'unverified',
      confidence: clampConfidence(base + (data.p3.patentDescription?.length ?? 0) > 50 ? 0.05 : 0),
      reasons: ['patent claimed', data.p3.patentDescription ? 'description provided' : 'no description'],
    }
  }

  // P4 team fields
  if (data.p4?.priorExits !== undefined) {
    const exits = data.p4.priorExits
    map['p4.priorExits'] = {
      source: 'founder_claim',
      verificationLevel: 'unverified',
      confidence: exits > 0 ? 0.70 : 0.60,
      reasons: [`${exits} exits stated`],
    }
  }

  return map
}

// ── Cross-source conflict detection ──────────────────────────────────────────

export function detectCrossSourceConflicts(
  data: AssessmentData,
  dqMap: DataQualityMap
): string[] {
  const conflicts: string[] = []

  const mrr = data.financial?.mrr ?? 0
  const arr = data.financial?.arr ?? 0
  // ARR should be close to MRR × 12
  if (mrr > 0 && arr > 0 && Math.abs(arr - mrr * 12) / (mrr * 12) > 0.5) {
    conflicts.push('financial.arr vs financial.mrr: ARR inconsistent with MRR×12 (>50% deviation)')
    // Apply conflict penalty to both
    if (dqMap['financial.mrr']) {
      dqMap['financial.mrr'].confidence = clampConfidence(dqMap['financial.mrr'].confidence - 0.15)
      dqMap['financial.mrr'].reasons.push('cross-source conflict with ARR')
    }
    if (dqMap['financial.arr']) {
      dqMap['financial.arr'].confidence = clampConfidence(dqMap['financial.arr'].confidence - 0.15)
      dqMap['financial.arr'].reasons.push('cross-source conflict with MRR')
    }
  }

  // Runway should be consistent with burn rate
  const runway = data.financial?.runway ?? 0
  const burn = data.financial?.monthlyBurn ?? 0
  if (runway > 0 && burn > 0 && arr > 0) {
    const impliedRunway = (arr / 12) / burn  // simplified
    if (Math.abs(runway - impliedRunway) / impliedRunway > 1.0) {
      conflicts.push('financial.runway inconsistent with burn rate')
    }
  }

  return conflicts
}
