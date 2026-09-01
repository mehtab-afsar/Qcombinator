/**
 * Q-Score Lite aggregation — pure, deterministic, no I/O.
 *
 * NOT the real Q-Score (features/qscore/calculators/q-score-calculator.ts) — fully independent
 * formula and code, computed from public evidence rather than founder self-report. Mirrors that
 * calculator's shape (exclude-from-both-sides renormalization for missing indicators) but
 * deliberately does NOT replicate its sparsity penalty (−0.5/indicator below 20 active): the
 * user's explicit instruction for Q-Score Lite is that missing evidence must never mechanically
 * lower the score, only the confidence — a penalty tied to indicator count would violate that.
 *
 *   IndicatorScore(i) = rawScore(i) × 20                                   // 0–5 → 0–100
 *   QSL        = Σ(IndicatorScore(i) × weight(i)) / Σ(weight(i))           — active indicators only
 *   confidence = Σ(evidenceWeight(i) for active i) / 20                    — over ALL 20, so a
 *                                                                             missing indicator drags
 *                                                                             confidence down without
 *                                                                             ever touching QSL
 */

import { PARAMETER_DEFINITIONS } from './parameters'
import { INDICATOR_DEFINITIONS, weightForIndicator } from './indicators'
import type { IndicatorExtraction, IndicatorResult, ParameterScore, QScoreLiteResult } from './types'
import { computeEvidenceWeightForExtraction } from './evidence-weight'

const TOTAL_INDICATOR_COUNT = INDICATOR_DEFINITIONS.length // 20

/** Groups already-computed indicator results by parameter — split out so it can be re-run on a
 *  cached DB row's stored `indicator_results` without recomputing evidence weights, as well as
 *  from a fresh calculation below. */
export function groupByParameter(indicators: IndicatorResult[]): ParameterScore[] {
  return PARAMETER_DEFINITIONS.map(param => {
    const paramIndicators = indicators.filter(i =>
      INDICATOR_DEFINITIONS.find(d => d.id === i.id)?.parameterId === param.id
    )
    const paramActive = paramIndicators.filter(i => i.indicatorScore !== null)
    const paramWeightSum = paramActive.reduce((sum, i) => sum + i.weight, 0)
    const score = paramWeightSum > 0
      ? Math.round((paramActive.reduce((sum, i) => sum + i.indicatorScore! * i.weight, 0) / paramWeightSum) * 100) / 100
      : null

    return {
      id: param.id,
      label: param.label,
      score,
      activeCount: paramActive.length,
      totalCount: paramIndicators.length,
    }
  })
}

export function calculateQScoreLite(
  extractions: IndicatorExtraction[],
  publishedDateByUrl: Map<string, string | undefined>,
  companyDomain: string,
): QScoreLiteResult {
  const indicators: IndicatorResult[] = extractions.map(extraction => {
    const weight = weightForIndicator(extraction.id)
    const evidenceWeight = computeEvidenceWeightForExtraction(extraction, publishedDateByUrl, companyDomain)
    const indicatorScore = extraction.rawScore === null ? null : extraction.rawScore * 20

    return {
      ...extraction,
      weight,
      reliability: evidenceWeight?.reliability ?? null,
      recency: evidenceWeight?.recency ?? null,
      corroboration: evidenceWeight?.corroboration ?? null,
      evidenceWeight: evidenceWeight?.evidenceWeight ?? null,
      indicatorScore,
    }
  })

  const active = indicators.filter(i => i.rawScore !== null && i.indicatorScore !== null)
  const activeWeightSum = active.reduce((sum, i) => sum + i.weight, 0)
  const qslScore = activeWeightSum > 0
    ? Math.round((active.reduce((sum, i) => sum + i.indicatorScore! * i.weight, 0) / activeWeightSum) * 100) / 100
    : 0

  const confidenceSum = active.reduce((sum, i) => sum + (i.evidenceWeight ?? 0), 0)
  const confidencePct = Math.round((confidenceSum / TOTAL_INDICATOR_COUNT) * 100 * 100) / 100

  return {
    qslScore,
    confidencePct,
    activeIndicatorCount: active.length,
    parameters: groupByParameter(indicators),
    indicators,
  }
}
