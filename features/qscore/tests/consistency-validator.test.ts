/**
 * Edge Alpha IQ Score v2 — Unit Tests: Consistency Validator
 * Tests all 6 rules (V01–V06) with pass and fail cases.
 */

import { validateConsistency } from '../validators/consistency-validator'
import type { AssessmentData, IndicatorScore } from '../types/qscore.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeIndicator(id: string, rawScore: number): IndicatorScore {
  return {
    id,
    name: `Indicator ${id}`,
    rawScore,
    excluded: rawScore === 0,
    dataQuality: {
      source: 'founder_claim',
      verificationLevel: 'unverified',
      confidence: 0.55,
      reasons: [],
    },
  }
}

function baseIndicators(): IndicatorScore[] {
  // All 30 indicators at neutral scores (3.0)
  const ids = [
    '1.1','1.2','1.3','1.4','1.5',
    '2.1','2.2','2.3','2.4','2.5',
    '3.1','3.2','3.3','3.4','3.5',
    '4.1','4.2','4.3','4.4','4.5',
    '5.1','5.2','5.3','5.4','5.5',
    '6.1','6.2','6.3','6.4','6.5',
  ]
  return ids.map(id => makeIndicator(id, 3.0))
}

function setScore(indicators: IndicatorScore[], id: string, score: number): void {
  const ind = indicators.find(i => i.id === id)!
  ind.rawScore = score
  ind.excluded = score === 0
}

function baseData(): AssessmentData {
  return {
    problemStory: 'Story',
    advantages: ['Advantage'],
    advantageExplanation: 'Explanation',
    hardshipStory: 'Hardship',
    customerType: 'Enterprise',
    conversationDate: null,
    customerQuote: 'Quote',
    customerSurprise: 'Surprise',
    customerCommitment: 'LOI signed',
    conversationCount: 20,
    customerList: ['Acme'],
    failedBelief: '', failedReasoning: '', failedDiscovery: '', failedChange: '',
    tested: '', buildTime: 4, measurement: '', results: '', learned: '', changed: '',
    hasPayingCustomers: true,
    financial: {
      mrr: 10_000,
      arr: 120_000,
      monthlyBurn: 8_000,
      runway: 15,
    },
  }
}

// ── V01: High WTP + No Revenue ────────────────────────────────────────────────

describe('V01: WTP ≥4 AND Revenue ≤1 → blocking (critical)', () => {
  test('V01 fires: 1.2=4 AND 6.1=1 → blocking', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.2', 4.0)
    setScore(indicators, '6.1', 1.0)
    const result = validateConsistency(indicators, baseData())
    const v01 = result.blocking.find(i => i.code === 'V01')
    expect(v01).toBeDefined()
    expect(result.isValid).toBe(false)
  })

  test('V01 does NOT fire: 1.2=4 AND 6.1=3', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.2', 4.0)
    setScore(indicators, '6.1', 3.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.blocking.find(i => i.code === 'V01')).toBeUndefined()
  })

  test('V01 does NOT fire: 1.2=3 AND 6.1=1', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.2', 3.0)
    setScore(indicators, '6.1', 1.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.blocking.find(i => i.code === 'V01')).toBeUndefined()
  })

  test('V01 does NOT fire when 6.1=0 (excluded) — exclusion means no contradiction possible', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.2', 5.0)
    setScore(indicators, '6.1', 0)  // excluded (pre-revenue stage)
    const result = validateConsistency(indicators, baseData())
    // V01 requires 6.1 > 0 to fire; excluded indicator = no contradiction
    expect(result.blocking.find(i => i.code === 'V01')).toBeUndefined()
  })
})

// ── V02: High Durability + No WTP ─────────────────────────────────────────────

describe('V02: Durability ≥3 AND WTP ≤1 → blocking (critical)', () => {
  test('V02 fires: 1.4=3 AND 1.2=1 → blocking', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.4', 3.0)
    setScore(indicators, '1.2', 1.0)
    const result = validateConsistency(indicators, baseData())
    const v02 = result.blocking.find(i => i.code === 'V02')
    expect(v02).toBeDefined()
    expect(result.isValid).toBe(false)
  })

  test('V02 does NOT fire when 1.2=0 (excluded) — exclusion means WTP question is not applicable', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.4', 5.0)
    setScore(indicators, '1.2', 0)  // excluded (pre-product)
    const result = validateConsistency(indicators, baseData())
    // V02 requires 1.2 > 0 (non-excluded) to fire
    expect(result.blocking.find(i => i.code === 'V02')).toBeUndefined()
  })

  test('V02 does NOT fire: 1.4=3 AND 1.2=2', () => {
    const indicators = baseIndicators()
    setScore(indicators, '1.4', 3.0)
    setScore(indicators, '1.2', 2.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.blocking.find(i => i.code === 'V02')).toBeUndefined()
  })
})

// ── V03: Runway inconsistency ─────────────────────────────────────────────────

describe('V03: Runway inconsistency with burn/cash → warning', () => {
  test('V03 fires: stated runway ≥24 but burn/arr implies <3 months', () => {
    const indicators = baseIndicators()
    const data = baseData()
    // ARR=120K, burn=200K/mo → ~0.5 months real runway
    data.financial = { mrr: 10_000, arr: 120_000, monthlyBurn: 200_000, runway: 24 }
    const result = validateConsistency(indicators, data)
    const v03 = result.warnings.find(i => i.code === 'V03')
    expect(v03).toBeDefined()
  })

  test('V03 does NOT fire: stated runway consistent with burn', () => {
    const indicators = baseIndicators()
    const data = baseData()
    // runway=15, burn=8K/mo → consistent
    data.financial = { mrr: 10_000, arr: 120_000, monthlyBurn: 8_000, runway: 15 }
    const result = validateConsistency(indicators, data)
    expect(result.warnings.find(i => i.code === 'V03')).toBeUndefined()
  })
})

// ── V04: Big market + few conversations ──────────────────────────────────────

describe('V04: Market size ≥4 AND conversations <5 → warning', () => {
  test('V04 fires: 2.1=4 AND conversationCount=2', () => {
    const indicators = baseIndicators()
    setScore(indicators, '2.1', 4.0)
    const data = baseData()
    data.conversationCount = 2
    const result = validateConsistency(indicators, data)
    const v04 = result.warnings.find(i => i.code === 'V04')
    expect(v04).toBeDefined()
  })

  test('V04 does NOT fire: 2.1=4 AND conversationCount=10', () => {
    const indicators = baseIndicators()
    setScore(indicators, '2.1', 4.0)
    const data = baseData()
    data.conversationCount = 10
    const result = validateConsistency(indicators, data)
    expect(result.warnings.find(i => i.code === 'V04')).toBeUndefined()
  })

  test('V04 does NOT fire: 2.1=3 AND conversationCount=2', () => {
    const indicators = baseIndicators()
    setScore(indicators, '2.1', 3.0)
    const data = baseData()
    data.conversationCount = 2
    const result = validateConsistency(indicators, data)
    expect(result.warnings.find(i => i.code === 'V04')).toBeUndefined()
  })
})

// ── V05: Many customers + very low ARPU ──────────────────────────────────────

describe('V05: ≥10 customers AND ARPU <$100 → warning', () => {
  test('V05 fires: 10+ customers and MRR/customer = $50', () => {
    const indicators = baseIndicators()
    const data = baseData()
    data.conversationCount = 15
    data.hasPayingCustomers = true
    data.financial = { mrr: 500, arr: 6_000, monthlyBurn: 5_000, runway: 6 }
    // ARPU = 500 / 15 = $33 < $100
    const result = validateConsistency(indicators, data)
    const v05 = result.warnings.find(i => i.code === 'V05')
    expect(v05).toBeDefined()
  })

  test('V05 does NOT fire: 15 customers and MRR = $15K (ARPU = $1000)', () => {
    const indicators = baseIndicators()
    const data = baseData()
    data.conversationCount = 15
    data.hasPayingCustomers = true
    data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000, runway: 18 }
    const result = validateConsistency(indicators, data)
    expect(result.warnings.find(i => i.code === 'V05')).toBeUndefined()
  })

  test('V05 does NOT fire: 5 customers (below threshold)', () => {
    const indicators = baseIndicators()
    const data = baseData()
    data.conversationCount = 5
    data.financial = { mrr: 200, arr: 2_400, monthlyBurn: 5_000 }
    const result = validateConsistency(indicators, data)
    expect(result.warnings.find(i => i.code === 'V05')).toBeUndefined()
  })
})

// ── V06: Low build complexity + high tech depth ───────────────────────────────

describe('V06: Build complexity ≤2 AND tech depth ≥4 → warning', () => {
  test('V06 fires: 3.4=2 AND 3.2=4', () => {
    const indicators = baseIndicators()
    setScore(indicators, '3.4', 2.0)
    setScore(indicators, '3.2', 4.0)
    const result = validateConsistency(indicators, baseData())
    const v06 = result.warnings.find(i => i.code === 'V06')
    expect(v06).toBeDefined()
  })

  test('V06 fires: 3.4=1 AND 3.2=5', () => {
    const indicators = baseIndicators()
    setScore(indicators, '3.4', 1.0)
    setScore(indicators, '3.2', 5.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.warnings.find(i => i.code === 'V06')).toBeDefined()
  })

  test('V06 does NOT fire: 3.4=3 AND 3.2=5', () => {
    const indicators = baseIndicators()
    setScore(indicators, '3.4', 3.0)
    setScore(indicators, '3.2', 5.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.warnings.find(i => i.code === 'V06')).toBeUndefined()
  })

  test('V06 does NOT fire: 3.4=2 AND 3.2=3', () => {
    const indicators = baseIndicators()
    setScore(indicators, '3.4', 2.0)
    setScore(indicators, '3.2', 3.0)
    const result = validateConsistency(indicators, baseData())
    expect(result.warnings.find(i => i.code === 'V06')).toBeUndefined()
  })
})

// ── isValid semantics ─────────────────────────────────────────────────────────

test('isValid=true when no blocking violations', () => {
  const indicators = baseIndicators()
  const result = validateConsistency(indicators, baseData())
  expect(result.isValid).toBe(true)
})

test('isValid=false when any blocking violation present', () => {
  const indicators = baseIndicators()
  setScore(indicators, '1.2', 5.0)
  setScore(indicators, '6.1', 1.0)
  const result = validateConsistency(indicators, baseData())
  expect(result.isValid).toBe(false)
})

test('warnings do not affect isValid', () => {
  const indicators = baseIndicators()
  // V04: big market + few conversations → warning only
  setScore(indicators, '2.1', 4.5)
  const data = baseData()
  data.conversationCount = 1
  const result = validateConsistency(indicators, data)
  // warnings may be present, but isValid should still be true (no blocking)
  expect(result.isValid).toBe(true)
  // at least the warning was generated
  expect(result.warnings.length).toBeGreaterThan(0)
})
