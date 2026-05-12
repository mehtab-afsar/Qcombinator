/**
 * Q-Score unit tests
 *
 * 1. calculateQScore — output always in [0, 100], finite, correct structure
 * 2. inferStage / normalizeSector — deterministic mapping
 * 3. aiActionsSchema — validates the cached actions shape
 * 4. Bounds guard logic — behaviour expected before a qscore_history insert
 */

import { calculateQScore, inferStage, normalizeSector } from '@/features/qscore/calculators/q-score-calculator'
import { aiActionsSchema } from '@/lib/api/jsonb-schemas'
import type { AssessmentData } from '@/features/qscore/types/qscore.types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMinimalAssessment(overrides: Partial<AssessmentData> = {}): AssessmentData {
  return {
    stage:    'mvp',
    industry: 'saas',
    ...overrides,
  } as AssessmentData
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — calculateQScore bounds
// calculateQScore(data, stage, sector, track?, customWeights?)
// Returns: { finalIQ, partialIQ, parameters[6], ... }
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateQScore', () => {
  it('returns finalIQ between 0 and 100 for a minimal assessment', () => {
    const result = calculateQScore(makeMinimalAssessment(), 'early', 'saas')
    expect(result.finalIQ).toBeGreaterThanOrEqual(0)
    expect(result.finalIQ).toBeLessThanOrEqual(100)
    expect(Number.isFinite(result.finalIQ)).toBe(true)
  })

  it('returns finalIQ between 0 and 100 for a data-rich assessment', () => {
    const assessment = makeMinimalAssessment({
      stage:         'seed',
      industry:      'saas',
      teamSize:      '5',
      mrr:           '10000',
      customerCount: '50',
    })
    const result = calculateQScore(assessment, 'mid', 'saas')
    expect(result.finalIQ).toBeGreaterThanOrEqual(0)
    expect(result.finalIQ).toBeLessThanOrEqual(100)
  })

  it('returns exactly 6 parameter scores', () => {
    const result = calculateQScore(makeMinimalAssessment(), 'early', 'saas')
    expect(result.parameters).toHaveLength(6)
  })

  it('all parameter averageScores are non-negative finite numbers', () => {
    const result = calculateQScore(makeMinimalAssessment(), 'early', 'saas')
    for (const p of result.parameters) {
      expect(Number.isFinite(p.averageScore)).toBe(true)
      expect(p.averageScore).toBeGreaterThanOrEqual(0)
    }
  })

  it('does not return NaN or Infinity for an empty assessment', () => {
    const result = calculateQScore({} as AssessmentData, 'early', 'default')
    expect(Number.isNaN(result.finalIQ)).toBe(false)
    expect(Number.isFinite(result.finalIQ)).toBe(true)
  })

  it('partialIQ is always in [0, 100]', () => {
    const result = calculateQScore(makeMinimalAssessment(), 'mid', 'saas')
    expect(result.partialIQ).toBeGreaterThanOrEqual(0)
    expect(result.partialIQ).toBeLessThanOrEqual(100)
  })

  it('produces consistent results for identical inputs', () => {
    const data = makeMinimalAssessment({ mrr: '5000' })
    const r1 = calculateQScore(data, 'early', 'saas')
    const r2 = calculateQScore(data, 'early', 'saas')
    expect(r1.finalIQ).toBe(r2.finalIQ)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 — inferStage / normalizeSector
// ─────────────────────────────────────────────────────────────────────────────

describe('inferStage', () => {
  it('maps "idea" to early stage', () => {
    expect(inferStage('idea')).toBe('early')
  })

  it('maps "mvp" to early stage', () => {
    expect(inferStage('mvp')).toBe('early')
  })

  it('maps "launched" to mid stage', () => {
    expect(inferStage('launched')).toBe('mid')
  })

  it('maps "scaling" to growth stage', () => {
    expect(inferStage('scaling')).toBe('growth')
  })

  it('falls back to "mid" for unknown stages', () => {
    expect(inferStage('unknown-stage-xyz')).toBe('mid')
  })

  it('is case-insensitive', () => {
    expect(inferStage('MVP')).toBe('early')
    expect(inferStage('SCALING')).toBe('growth')
  })
})

describe('normalizeSector', () => {
  it('normalises known sectors without throwing', () => {
    expect(() => normalizeSector('ai_ml')).not.toThrow()
    expect(() => normalizeSector('saas')).not.toThrow()
    expect(() => normalizeSector('fintech')).not.toThrow()
  })

  it('returns a non-empty string for unknown sectors', () => {
    const result = normalizeSector('completely-unknown-sector')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 — aiActionsSchema
// ─────────────────────────────────────────────────────────────────────────────

const validAction = {
  title:         'Build ICP document',
  description:   'Define your ideal customer profile.',
  dimension:     'market',
  impact:        '+5 points',
  agentId:       'patel',
  agentName:     'Patel',
  timeframe:     '1 week',
  starterPrompt: 'Hi Patel, help me build an ICP for B2B fintech.',
}

const validUnlockCard = {
  indicatorId:        'icp_defined',
  indicatorName:      'ICP Defined',
  parameterId:        'P1',
  currentScore:       2,
  targetScore:        5,
  estimatedPointGain: 8,
  action:             'Build ICP with Patel',
  agentId:            'patel',
}

describe('aiActionsSchema', () => {
  it('accepts a valid actions array', () => {
    const result = aiActionsSchema.safeParse({ actions: [validAction] })
    expect(result.success).toBe(true)
  })

  it('accepts an empty actions array', () => {
    const result = aiActionsSchema.safeParse({ actions: [] })
    expect(result.success).toBe(true)
  })

  it('accepts the full shape including unlockCards and readinessSummary', () => {
    const result = aiActionsSchema.safeParse({
      actions:          [validAction],
      unlockCards:      [validUnlockCard],
      readinessSummary: 'You are 60% ready.',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty object (no cached data yet)', () => {
    const result = aiActionsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts unknown top-level keys via passthrough', () => {
    const result = aiActionsSchema.safeParse({ actions: [], rag_eval: { scoringMethod: 'hybrid', ragConfidence: 0.85 } })
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Bounds guard logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Q-Score bounds guard', () => {
  function isScoreValid(score: number): boolean {
    return Number.isFinite(score) && score >= 0 && score <= 100
  }

  it('accepts scores within range', () => {
    expect(isScoreValid(0)).toBe(true)
    expect(isScoreValid(50)).toBe(true)
    expect(isScoreValid(100)).toBe(true)
  })

  it('rejects score below 0', () => {
    expect(isScoreValid(-1)).toBe(false)
  })

  it('rejects score above 100', () => {
    expect(isScoreValid(101)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isScoreValid(NaN)).toBe(false)
  })

  it('rejects Infinity', () => {
    expect(isScoreValid(Infinity)).toBe(false)
    expect(isScoreValid(-Infinity)).toBe(false)
  })
})
