/**
 * Gap Ranker — identifies missing scoring indicators and ranks them by impact.
 *
 * After a document upload, extracted fields are mapped to the 30 IQ-score indicators
 * (P1–P6, 5 each). Missing indicators are ranked by:
 *   impact = blended_param_weight[param] × (1/5)  (each indicator within a param shares equally)
 *
 * The blended weight already incorporates SECTOR_WEIGHTS × STAGE_MULTIPLIER, so a B2B SaaS
 * founder gets financial/market questions first; a biotech founder gets IP/team questions first.
 */

import { getBlendedParamWeights, inferStage } from '@/features/qscore/calculators/iq-score-calculator'
import { FIELD_QUESTIONS, getNestedValue } from '@/lib/profile-builder/smart-questions'

export interface GapQuestion {
  field: string
  question: string
  contextHint: string
  helpText: string
  impact: number       // 0–1, higher = more effect on score
  paramLabel: string
  paramIdx: number     // 0=P1 … 5=P6
}

const PARAM_LABELS = [
  'Market Readiness',
  'Market Potential',
  'IP / Defensibility',
  'Founder / Team',
  'Structural Impact',
  'Financials',
]

// Each field maps to the parameter index (0-based) it contributes to in the IQ score.
const INDICATOR_PARAM: Record<string, number> = {
  // P1 — Market Readiness
  customerCommitment:        0,
  conversationCount:         0,
  hasPayingCustomers:        0,
  hasRetention:              0,
  salesCycleLength:          0,
  // P2 — Market Potential
  'p2.tamDescription':          1,
  'p2.marketUrgency':           1,
  'p2.competitorDensityContext': 1,
  'p2.valuePool':               1,
  'p2.expansionPotential':      1,
  // P3 — IP / Defensibility
  'p3.hasPatent':               2,
  'p3.buildComplexity':         2,
  'p3.replicationTimeMonths':   2,
  'p3.technicalDepth':          2,
  'p3.knowHowDensity':          2,
  // P4 — Founder / Team
  'p4.domainYears':             3,
  'p4.founderMarketFit':        3,
  'p4.teamCoverage':            3,
  'p4.priorExits':              3,
  'p4.teamCohesionMonths':      3,
  // P5 — Structural Impact
  'p5.climateLeverage':         4,
  'p5.socialImpact':            4,
  'p5.revenueImpactLink':       4,
  'p5.businessModelAlignment':  4,
  'p5.viksitBharatAlignment':   4,
  // P6 — Financials
  'financial.mrr':              5,
  'financial.monthlyBurn':      5,
  'financial.runway':           5,
}

/**
 * Given extracted AssessmentData fields + sector + stage, returns the top N
 * missing indicator questions ranked by their contribution to the IQ score.
 */
export function rankMissingIndicators(
  extracted: Record<string, unknown>,
  sector: string,
  stage: string,
  topN = 3,
): GapQuestion[] {
  const scoreStage = inferStage(stage)
  const weights = getBlendedParamWeights(sector, scoreStage)

  const gaps: GapQuestion[] = []

  for (const [field, paramIdx] of Object.entries(INDICATOR_PARAM)) {
    const value = getNestedValue(extracted, field)
    if (value !== null && value !== undefined && value !== '') continue

    const def = FIELD_QUESTIONS[field]
    if (!def) continue

    // Each of the 5 indicators within a param shares the param weight equally
    const impact = (weights[paramIdx] ?? 0) * 0.20

    gaps.push({
      field,
      question: def.text,
      contextHint: def.getContext(extracted),
      helpText: def.helpText,
      impact,
      paramLabel: PARAM_LABELS[paramIdx],
      paramIdx,
    })
  }

  return gaps
    .sort((a, b) => b.impact - a.impact)
    .slice(0, topN)
}
