/**
 * Edge Alpha IQ Score v2 — Cross-Indicator Consistency Validator
 *
 * 6 rules (V01–V06). Blocking violations prevent submit (400).
 * Warnings stored in assessment_data.validationWarnings.
 *
 * V01: 1.2 score ≥4 AND 6.1 score ≤1 → critical (blocking)
 * V02: 1.4 score ≥3 AND 1.2 score ≤1 → critical (blocking)
 * V03: Runway inconsistent with burn/cash → high
 * V04: 2.1 score ≥4 AND conversations <5 → medium
 * V05: ≥10 customers AND MRR/customer <$100 → medium
 * V06: Build complexity ≤2 AND tech depth ≥4 → medium
 */

import type { AssessmentData, IndicatorScore } from '../types/qscore.types'

export interface ValidationIssue {
  code: string
  message: string
  severity: 'critical' | 'high' | 'medium'
  blocking: boolean
}

export interface ValidationResult {
  blocking: ValidationIssue[]
  warnings: ValidationIssue[]
  isValid: boolean
}

export function validateConsistency(
  indicators: IndicatorScore[],
  data: AssessmentData
): ValidationResult {
  const issues: ValidationIssue[] = []
  const scoreMap = new Map(indicators.map(i => [i.id, i.rawScore]))

  const get = (id: string): number => scoreMap.get(id) ?? 0

  // ── V01: High WTP signal but no revenue scale ─────────────────────────────
  // Paying customers (1.2 ≥4) but revenue scale (6.1 ≤1) — contradiction
  if (get('1.2') >= 4 && get('6.1') > 0 && get('6.1') <= 1) {
    issues.push({
      code: 'V01',
      message: 'High willingness-to-pay (1.2 ≥4) contradicts near-zero revenue scale (6.1 ≤1). ' +
        'If customers are paying, revenue should be measurable.',
      severity: 'critical',
      blocking: true,
    })
  }

  // ── V02: High durability but no willingness to pay ────────────────────────
  // Customers staying (1.4 ≥3) but no one paying (1.2 ≤1) — unusual
  if (get('1.4') >= 3 && get('1.2') <= 1 && get('1.2') > 0) {
    issues.push({
      code: 'V02',
      message: 'High durability/retention (1.4 ≥3) with near-zero willingness-to-pay (1.2 ≤1). ' +
        'Retention without monetization is unusual — clarify if customers are paying or on free tier.',
      severity: 'critical',
      blocking: true,
    })
  }

  // ── V03: Runway inconsistent with burn/cash ───────────────────────────────
  const runway = data.financial?.runway
  const burn = data.financial?.monthlyBurn
  if (runway !== undefined && burn !== undefined && burn > 0) {
    // If burn rate is very high but runway is also very high, data may be inconsistent
    const arr = data.financial?.arr ?? (data.financial?.mrr ?? 0) * 12
    const impliedCash = runway * burn
    const statedCash = arr / 12 * runway  // rough estimate
    if (statedCash > 0 && impliedCash / statedCash > 5) {
      issues.push({
        code: 'V03',
        message: `Runway of ${runway} months at $${burn.toLocaleString()}/mo burn implies $${(impliedCash / 1000).toFixed(0)}K cash on hand. ` +
          'This appears high relative to stated revenue — verify cash balance.',
        severity: 'high',
        blocking: false,
      })
    }
  }

  // ── V04: Large market claim with few customer conversations ──────────────
  if (get('2.1') >= 4 && (data.conversationCount ?? 0) < 5) {
    issues.push({
      code: 'V04',
      message: 'Large market size claim (2.1 ≥4) but fewer than 5 customer conversations. ' +
        'Market sizing without customer validation is speculative.',
      severity: 'medium',
      blocking: false,
    })
  }

  // ── V05: Many customers but very low revenue per customer ─────────────────
  const customerCount = data.conversationCount ?? 0
  const mrr = data.financial?.mrr ?? 0
  if (customerCount >= 10 && mrr > 0 && mrr / customerCount < 100) {
    issues.push({
      code: 'V05',
      message: `${customerCount} customers but only $${Math.round(mrr / customerCount)}/customer MRR. ` +
        'Very low ARPU may signal free-tier customers being counted as paying.',
      severity: 'medium',
      blocking: false,
    })
  }

  // ── V06: Low build complexity but high technical depth claim ─────────────
  const buildComplexScore = get('3.4')
  const techDepthScore = get('3.2')
  if (buildComplexScore > 0 && buildComplexScore <= 2 && techDepthScore >= 4) {
    issues.push({
      code: 'V06',
      message: 'Low build complexity (3.4 ≤2) contradicts high technical depth claim (3.2 ≥4). ' +
        'If the tech is truly deep, it should take significant time to replicate.',
      severity: 'medium',
      blocking: false,
    })
  }

  // ── V07: High burn but long runway — implies large cash reserve ───────────
  const burnEff = get('6.2')
  const runwayScore = get('6.3')
  if (burnEff > 0 && burnEff < 2 && runwayScore >= 4) {
    issues.push({
      code: 'V07',
      message: 'High burn rate (6.2 <2) but long runway (6.3 ≥4) — this implies a large cash reserve. ' +
        'Confirm current cash balance and how long since last raise.',
      severity: 'medium',
      blocking: false,
    })
  }

  // ── V08: Unusually long domain experience ─────────────────────────────────
  const domainYears = data.p4?.domainYears ?? 0
  if (domainYears > 20) {
    issues.push({
      code: 'V08',
      message: `Domain experience of ${domainYears} years is unusually high — please verify dates and context.`,
      severity: 'medium',
      blocking: false,
    })
  }

  const blocking = issues.filter(i => i.blocking)
  const warnings = issues.filter(i => !i.blocking)

  return { blocking, warnings, isValid: blocking.length === 0 }
}
