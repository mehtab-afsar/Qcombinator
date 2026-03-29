/**
 * Edge Alpha IQ Score v2 — Orchestrator
 *
 * Core formula: Final IQ = Σ(rawScore_i for all 30 indicators) ÷ (30 × 5) × 100
 *                        = Σ(all rawScores) / 150 × 100
 *
 * Denominator is ALWAYS 150 — constant regardless of exclusions.
 * Excluded indicators contribute rawScore=0 to the numerator.
 * Confidence is METADATA ONLY — never touches rawScore.
 * AI reconciliation = flags only (vcAlert string) — never overrides rawScore.
 */

import { scoreP1 } from './parameters/p1-market-readiness'
import { scoreP2 } from './parameters/p2-market-potential'
import { scoreP3 } from './parameters/p3-ip-defensibility'
import { scoreP4 } from './parameters/p4-founder-team'
import { scoreP5, determineTrack } from './parameters/p5-structural-impact-v2'
import { scoreP6 } from './parameters/p6-financials'
import { calculateGrade } from '../types/qscore.types'
import type {
  AssessmentData,
  IQScoreResult,
  IndicatorScore,
  ParameterScore,
  ScoreStage,
  StartupTrack,
} from '../types/qscore.types'

export { type IQScoreResult, type ParameterScore, type IndicatorScore }

// ── Sector weight profiles (fallback when DB unavailable) ─────────────────────

const SECTOR_WEIGHTS: Record<string, [number, number, number, number, number, number]> = {
  b2b_saas:            [0.24, 0.18, 0.10, 0.16, 0.05, 0.27],
  biotech:             [0.08, 0.18, 0.32, 0.26, 0.08, 0.08],
  marketplace:         [0.28, 0.24, 0.08, 0.16, 0.06, 0.18],
  fintech:             [0.20, 0.18, 0.18, 0.20, 0.08, 0.16],
  consumer:            [0.26, 0.22, 0.06, 0.14, 0.06, 0.26],
  climate:             [0.14, 0.20, 0.22, 0.18, 0.18, 0.08],
  hardware:            [0.12, 0.20, 0.28, 0.22, 0.06, 0.12],
  edtech:              [0.18, 0.20, 0.10, 0.16, 0.12, 0.24],
  healthtech:          [0.16, 0.18, 0.22, 0.20, 0.10, 0.14],
  ai_ml:               [0.20, 0.20, 0.18, 0.22, 0.06, 0.14],
  enterprise_software: [0.22, 0.18, 0.12, 0.18, 0.06, 0.24],
  logistics:           [0.20, 0.20, 0.10, 0.16, 0.08, 0.26],
  agriculture:         [0.14, 0.20, 0.18, 0.18, 0.16, 0.14],
  proptech:            [0.18, 0.22, 0.10, 0.16, 0.08, 0.26],
  default:             [0.20, 0.20, 0.17, 0.18, 0.08, 0.17],
}

// Stage multipliers from design spec (Sheet 9): applied then renormalized
// Order: [p1, p2, p3, p4, p5, p6]
const STAGE_MULTIPLIER: Record<ScoreStage, [number, number, number, number, number, number]> = {
  early:  [0.70, 1.05, 1.20, 1.30, 1.00, 0.60],
  mid:    [1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
  growth: [1.30, 0.95, 0.80, 0.90, 0.90, 1.40],
}

const PARAM_NAMES = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
const PARAM_LABELS = ['Market Readiness', 'Market Potential', 'IP / Defensibility', 'Founder / Team', 'Structural Impact', 'Financials']

function blendAndNormalizeWeights(
  base: [number, number, number, number, number, number],
  stage: ScoreStage
): number[] {
  const multipliers = STAGE_MULTIPLIER[stage]
  const raw = base.map((w, i) => w * multipliers[i])
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map(w => Math.max(0, w / sum))
}

function getSectorWeights(sector: string, stage: ScoreStage): number[] {
  const base = SECTOR_WEIGHTS[sector] ?? SECTOR_WEIGHTS['default']
  return blendAndNormalizeWeights(base, stage)
}

// ── Average score for display ─────────────────────────────────────────────────

function parameterAverage(indicators: IndicatorScore[]): number {
  const active = indicators.filter(i => !i.excluded)
  if (active.length === 0) return 0
  return active.reduce((s, i) => s + i.rawScore, 0) / active.length
}

// ── Main calculator ───────────────────────────────────────────────────────────

export function calculateIQScore(
  data: AssessmentData,
  stage: ScoreStage,
  sector: string,
  track?: StartupTrack,
  customWeights?: number[]
): IQScoreResult {
  const resolvedTrack: StartupTrack = track ?? determineTrack(data)

  // Score all 6 parameters
  const p1Indicators = scoreP1(data, stage)
  const p2Indicators = scoreP2(data, stage)
  const p3Indicators = scoreP3(data, stage)
  const p4Indicators = scoreP4(data, stage)
  const p5Indicators = scoreP5(data, stage, resolvedTrack)
  const p6Indicators = scoreP6(data, stage)

  const allIndicators = [p1Indicators, p2Indicators, p3Indicators, p4Indicators, p5Indicators, p6Indicators]

  // Sector + stage adaptive weights
  const weights = customWeights ?? getSectorWeights(sector, stage)

  // Build ParameterScore objects
  const parameters: ParameterScore[] = allIndicators.map((indicators, i) => ({
    id: PARAM_NAMES[i],
    name: PARAM_LABELS[i],
    weight: weights[i],
    indicators,
    rawSum: indicators.reduce((s, ind) => s + ind.rawScore, 0),
    averageScore: parameterAverage(indicators),
  }))

  // Core formula: Σ(all 30 rawScores) / 150 × 100
  // Denominator is ALWAYS 150, regardless of exclusions
  const totalRaw = parameters.reduce((s, p) => s + p.rawSum, 0)
  const DENOMINATOR = 30 * 5  // 150 — constant
  const finalIQ = Math.round((totalRaw / DENOMINATOR) * 100 * 10) / 10

  // Available IQ: how high could this startup score with current data (non-excluded only)
  const activeIndicators = parameters.flatMap(p => p.indicators).filter(i => !i.excluded)
  const activeRaw = activeIndicators.reduce((s, i) => s + i.rawScore, 0)
  const activeDenominator = activeIndicators.length * 5
  const availableIQ = activeDenominator > 0
    ? Math.round((activeRaw / activeDenominator) * 100 * 10) / 10
    : 0

  const indicatorsActive = activeIndicators.length
  const indicatorsExcluded = 30 - indicatorsActive

  // Collect reconciliation flags from indicators
  const reconciliationFlags = parameters
    .flatMap(p => p.indicators)
    .filter(i => i.vcAlert)
    .map(i => `${i.id}: ${i.vcAlert}`)

  return {
    finalIQ: Math.min(100, Math.max(0, finalIQ)),
    availableIQ: Math.min(100, Math.max(0, availableIQ)),
    grade: calculateGrade(finalIQ),
    parameters,
    indicatorsActive,
    indicatorsExcluded,
    track: resolvedTrack,
    sector,
    stage,
    reconciliationFlags,
    validationWarnings: [],  // set by consistency-validator
    calculatedAt: new Date(),
  }
}

// ── Stage inference from founder profile ──────────────────────────────────────

export function inferStage(founderStage: string): ScoreStage {
  const s = founderStage?.toLowerCase() ?? ''
  if (['idea', 'pre-product', 'pre-revenue', 'mvp'].includes(s)) return 'early'
  if (['launched', 'post-mvp'].includes(s)) return 'mid'
  if (['growing', 'scaling', 'series-a', 'series-b', 'growth'].includes(s)) return 'growth'
  if (s.includes('pre')) return 'early'
  if (s.includes('grow') || s.includes('scal')) return 'growth'
  return 'mid'
}

// ── Sector normalization ──────────────────────────────────────────────────────

export function normalizeSector(sector: string): string {
  const s = (sector ?? '').toLowerCase().replace(/[^a-z0-9]/g, '_')
  const known = Object.keys(SECTOR_WEIGHTS)
  if (known.includes(s)) return s
  // Fuzzy map
  if (s.includes('saas') || s.includes('b2b')) return 'b2b_saas'
  if (s.includes('bio') || s.includes('deep') || s.includes('pharma')) return 'biotech'
  if (s.includes('market')) return 'marketplace'
  if (s.includes('fin')) return 'fintech'
  if (s.includes('consumer') || s.includes('retail')) return 'consumer'
  if (s.includes('climat') || s.includes('clean') || s.includes('green')) return 'climate'
  if (s.includes('hard')) return 'hardware'
  if (s.includes('ed')) return 'edtech'
  if (s.includes('health') || s.includes('med')) return 'healthtech'
  if (s.includes('ai') || s.includes('ml') || s.includes('data')) return 'ai_ml'
  if (s.includes('enterprise') || s.includes('erp') || s.includes('crm')) return 'enterprise_software'
  if (s.includes('logis') || s.includes('supply') || s.includes('freight') || s.includes('transport')) return 'logistics'
  if (s.includes('agri') || s.includes('farm') || s.includes('food')) return 'agriculture'
  if (s.includes('prop') || s.includes('real_est') || s.includes('realestate') || s.includes('real estate')) return 'proptech'
  return 'default'
}
