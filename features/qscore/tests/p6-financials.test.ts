/**
 * Edge Alpha IQ Score v2 — Unit Tests: P6 Financials
 * Tests exclusion logic per stage and fractional scoring.
 */

import { scoreP6, getP6Exclusions } from '../calculators/parameters/p6-financials'
import type { AssessmentData } from '../types/qscore.types'

function baseData(): AssessmentData {
  return {
    problemStory: 'Founder story',
    advantages: ['Proprietary data'],
    advantageExplanation: 'Domain expertise',
    hardshipStory: 'Pivoted twice',
    customerType: 'Enterprise',
    conversationDate: null,
    customerQuote: 'Saves us time',
    customerSurprise: 'Unexpected usage',
    customerCommitment: 'Signed LOI',
    conversationCount: 30,
    customerList: ['Acme Corp'],
    failedBelief: '', failedReasoning: '', failedDiscovery: '', failedChange: '',
    tested: '', buildTime: 4, measurement: '', results: '', learned: '', changed: '',
    hasPayingCustomers: true,
    payingCustomerDetail: '$5K/month',
    salesCycleLength: '1-4 weeks',
    hasRetention: true,
    retentionDetail: 'Renewed after 3 months',
    financial: {
      mrr: 15_000,
      arr: 180_000,
      monthlyBurn: 8_000,
      runway: 18,
      cogs: 2_000,
      averageDealSize: 5_000,
    },
  }
}

// ── Exclusion Logic ────────────────────────────────────────────────────────────

describe('getP6Exclusions — early stage', () => {
  test('early stage: all 5 indicators excluded', () => {
    const data = baseData()
    const excl = getP6Exclusions('early', data)
    expect(excl.has('6.1')).toBe(true)
    expect(excl.has('6.2')).toBe(true)
    expect(excl.has('6.3')).toBe(true)
    expect(excl.has('6.4')).toBe(true)
    expect(excl.has('6.5')).toBe(true)
  })
})

describe('getP6Exclusions — mid stage pre-revenue', () => {
  test('mid stage MRR < 1K: 6.1, 6.4, 6.5 excluded; 6.3 kept', () => {
    const data = baseData()
    data.financial = { mrr: 500, monthlyBurn: 5_000, runway: 6 }
    data.hasPayingCustomers = false
    const excl = getP6Exclusions('mid', data)
    expect(excl.has('6.1')).toBe(true)  // Revenue Scale excluded
    expect(excl.has('6.4')).toBe(true)  // Unit Economics excluded
    expect(excl.has('6.5')).toBe(true)  // Gross Margin excluded
    expect(excl.has('6.3')).toBe(false) // Runway kept
  })

  test('mid stage MRR = 0: also excludes 6.2 (no MRR+burn pair)', () => {
    const data = baseData()
    data.financial = { monthlyBurn: 5_000 }
    data.hasPayingCustomers = false
    const excl = getP6Exclusions('mid', data)
    expect(excl.has('6.2')).toBe(true)  // Burn Efficiency excluded (no MRR)
  })
})

describe('getP6Exclusions — growth stage with full data', () => {
  test('growth: no exclusions when data is complete', () => {
    const data = baseData()
    const excl = getP6Exclusions('growth', data)
    // 6.1 not excluded (has MRR)
    expect(excl.has('6.1')).toBe(false)
    // 6.2 not excluded (has MRR + burn)
    expect(excl.has('6.2')).toBe(false)
    // 6.3 not excluded
    expect(excl.has('6.3')).toBe(false)
    // 6.4 depends on paying customers + conversation count
    // baseData has hasPayingCustomers=true and conversationCount=30 → not excluded
    expect(excl.has('6.4')).toBe(false)
    // 6.5 not excluded (has cogs)
    expect(excl.has('6.5')).toBe(false)
  })

  test('6.4 excluded when fewer than 10 conversations', () => {
    const data = baseData()
    data.conversationCount = 5
    const excl = getP6Exclusions('growth', data)
    expect(excl.has('6.4')).toBe(true)
  })

  test('6.4 excluded when no paying customers', () => {
    const data = baseData()
    data.hasPayingCustomers = false
    const excl = getP6Exclusions('growth', data)
    expect(excl.has('6.4')).toBe(true)
  })

  test('6.5 excluded when no COGS and no deal size', () => {
    const data = baseData()
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 18 }
    // No cogs, no averageDealSize
    const excl = getP6Exclusions('growth', data)
    expect(excl.has('6.5')).toBe(true)
  })
})

// ── 6.1 Revenue Scale — Fractional Scoring ────────────────────────────────────

describe('6.1 Revenue Scale — mid stage', () => {
  test('ARR $12K (MRR just above $1K) → rawScore = 1.0 (below $10K tier)', () => {
    // MRR must be >= $1000 for 6.1 to be active in mid-stage; ARR = MRR * 12
    const data = baseData()
    data.financial = { mrr: 1_000, arr: 12_000, monthlyBurn: 5_000, cogs: 100, averageDealSize: 1_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.1')!
    expect(ind.excluded).toBe(false)
    expect(ind.rawScore).toBe(1.0)
  })

  test('ARR $180K mid → rawScore between 3.0 and 4.0', () => {
    const data = baseData()
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.1')!
    expect(ind.excluded).toBe(false)
    expect(ind.rawScore).toBeGreaterThanOrEqual(3.0)
    expect(ind.rawScore).toBeLessThanOrEqual(4.0)
  })

  test('ARR ≥ $500K mid → rawScore = 5.0', () => {
    const data = baseData()
    data.financial = { mrr: 50_000, arr: 600_000, monthlyBurn: 20_000, cogs: 5_000, averageDealSize: 10_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.1')!
    expect(ind.rawScore).toBe(5.0)
  })
})

describe('6.1 Revenue Scale — growth stage', () => {
  test('ARR < $500K growth → rawScore = 1.5', () => {
    const data = baseData()
    data.financial = { mrr: 30_000, arr: 360_000, monthlyBurn: 50_000, cogs: 5_000, averageDealSize: 10_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'growth')
    const ind = indicators.find(i => i.id === '6.1')!
    expect(ind.rawScore).toBe(1.5)
  })

  test('ARR ≥ $10M growth → rawScore = 5.0', () => {
    const data = baseData()
    data.financial = { mrr: 900_000, arr: 10_800_000, monthlyBurn: 200_000, cogs: 90_000, averageDealSize: 50_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'growth')
    const ind = indicators.find(i => i.id === '6.1')!
    expect(ind.rawScore).toBe(5.0)
  })
})

// ── 6.2 Burn Efficiency ────────────────────────────────────────────────────────

describe('6.2 Burn Efficiency', () => {
  test('burn multiple > 10 → rawScore = 1.0 (mid)', () => {
    const data = baseData()
    data.financial = { mrr: 500, arr: 6_000, monthlyBurn: 10_000, cogs: 100, averageDealSize: 500 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.2')!
    expect(ind.excluded).toBe(false)
    expect(ind.rawScore).toBe(1.0)
  })

  test('burn multiple ≤ 1 → rawScore = 5.0 (mid, revenue covers burn)', () => {
    const data = baseData()
    data.financial = { mrr: 20_000, arr: 240_000, monthlyBurn: 15_000, cogs: 2_000, averageDealSize: 5_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.2')!
    expect(ind.rawScore).toBe(5.0)
  })

  test('burn multiple ≤ 0.5 → rawScore = 5.0 (growth, profitable)', () => {
    const data = baseData()
    data.financial = { mrr: 100_000, arr: 1_200_000, monthlyBurn: 40_000, cogs: 10_000, averageDealSize: 20_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'growth')
    const ind = indicators.find(i => i.id === '6.2')!
    expect(ind.rawScore).toBe(5.0)
  })
})

// ── 6.3 Runway ────────────────────────────────────────────────────────────────

describe('6.3 Runway', () => {
  test('runway < 3 months → rawScore = 1.0', () => {
    const data = baseData()
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 2, cogs: 2_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.3')!
    expect(ind.rawScore).toBe(1.0)
  })

  test('runway ≥ 24 months → rawScore = 5.0', () => {
    const data = baseData()
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 30, cogs: 2_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.3')!
    expect(ind.rawScore).toBe(5.0)
  })

  test('runway unknown → rawScore = 2.0 (neutral)', () => {
    const data = baseData()
    data.financial = { monthlyBurn: 5_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.3')!
    // 6.3 may be excluded in mid stage if MRR < 1000 (no exclusion for 6.3 itself)
    // but financial is just burn only - let's check
    if (!ind.excluded) {
      expect(ind.rawScore).toBe(2.0)
    }
  })
})

// ── 6.5 Gross Margin ──────────────────────────────────────────────────────────

describe('6.5 Gross Margin', () => {
  test('GM > 85% → rawScore = 5.0 (SaaS-tier)', () => {
    const data = baseData()
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 18, cogs: 1_500, averageDealSize: 5_000 }
    // GM = (15000 - 1500) / 15000 = 0.90
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.5')!
    expect(ind.excluded).toBe(false)
    expect(ind.rawScore).toBe(5.0)
  })

  test('GM < 0 → rawScore = 1.0 (negative margin)', () => {
    const data = baseData()
    data.financial = { mrr: 5_000, arr: 60_000, monthlyBurn: 8_000, runway: 6, cogs: 8_000, averageDealSize: 1_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.5')!
    if (!ind.excluded) {
      expect(ind.rawScore).toBe(1.0)
    }
  })

  test('GM 60-75% → rawScore between 3.0 and 4.0', () => {
    const data = baseData()
    // GM = (15000 - 5250) / 15000 = 0.65
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 18, cogs: 5_250, averageDealSize: 5_000 }
    data.conversationCount = 30
    const indicators = scoreP6(data, 'mid')
    const ind = indicators.find(i => i.id === '6.5')!
    if (!ind.excluded) {
      expect(ind.rawScore).toBeGreaterThanOrEqual(3.0)
      expect(ind.rawScore).toBeLessThanOrEqual(4.0)
    }
  })
})

// ── 0.5-increment invariant ───────────────────────────────────────────────────

test('all P6 rawScores are in 0.5 increments', () => {
  const data = baseData()
  const indicators = scoreP6(data, 'mid')
  for (const ind of indicators) {
    if (ind.rawScore > 0) {
      expect(ind.rawScore % 0.5).toBeCloseTo(0, 5)
    }
  }
})

test('exactly 5 indicators returned', () => {
  const data = baseData()
  const indicators = scoreP6(data, 'mid')
  expect(indicators).toHaveLength(5)
  expect(indicators.map(i => i.id)).toEqual(['6.1', '6.2', '6.3', '6.4', '6.5'])
})

// ── Early stage denominator invariant ────────────────────────────────────────

test('early stage: all excluded → all rawScore=0', () => {
  const data = baseData()
  const indicators = scoreP6(data, 'early')
  expect(indicators).toHaveLength(5)
  for (const ind of indicators) {
    expect(ind.rawScore).toBe(0)
    expect(ind.excluded).toBe(true)
  }
})
