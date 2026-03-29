/**
 * Edge Alpha IQ Score v2 — Unit Tests: IQ Score Calculator
 * Tests the core formula and key invariants.
 */

import { calculateIQScore, inferStage, normalizeSector } from '../calculators/iq-score-calculator'
import type { AssessmentData } from '../types/qscore.types'

// ── Base test data ─────────────────────────────────────────────────────────────

function baseData(): AssessmentData {
  return {
    problemStory: 'I spent 8 years in enterprise procurement before founding this.',
    advantages: ['Proprietary data pipeline', 'Former Salesforce enterprise team'],
    advantageExplanation: 'We have 8 years domain experience and exclusive data access.',
    hardshipStory: 'Pivoted twice and lost a co-founder in year one.',
    customerType: 'Enterprise SaaS buyers',
    conversationDate: null,
    customerQuote: 'This saves us 20 hours a month',
    customerSurprise: 'Customers wanted integrations we had not considered',
    customerCommitment: 'Signed LOI with Acme Corp',
    conversationCount: 30,
    customerList: ['Acme Corp', 'Beta Inc'],
    failedBelief: '', failedReasoning: '', failedDiscovery: '', failedChange: '',
    tested: '', buildTime: 9, measurement: '', results: '', learned: '', changed: '',
    hasPayingCustomers: true,
    payingCustomerDetail: '$5,000/month contract with Acme Corp',
    salesCycleLength: '1-4 weeks',
    hasRetention: true,
    retentionDetail: 'Acme Corp renewed after 3 months, requesting expansion',
    financial: { mrr: 15000, arr: 180000, monthlyBurn: 8000, runway: 18, cogs: 2000, averageDealSize: 5000 },
    p2: {
      tamDescription: 'Our SAM is $2B based on 500K enterprise procurement teams × $4K average spend. Source: Gartner 2024.',
      marketUrgency: 'Post-COVID supply chain disruptions triggered $80B in procurement digitization in 2023.',
      valuePool: 'Enterprises waste $120B/year on manual procurement overhead.',
      expansionPotential: 'Phase 1: US enterprise. Phase 2: EMEA. Phase 3: SMB via API marketplace.',
      competitorCount: 3,
      competitorDensityContext: 'Coupa, Jaggaer, SAP Ariba — but none focused on our vertical niche.',
    },
    p3: {
      hasPatent: true,
      patentDescription: 'Patent pending #US2024-123456 for our ML-based supplier matching algorithm',
      technicalDepth: 'Proprietary ML model trained on 10M procurement transactions. Real-time matching algorithm.',
      knowHowDensity: 'Exclusive data partnerships with 3 major distributors. 8 years of domain expertise.',
      buildComplexity: '12+ months',
      replicationCostUsd: 3_000_000,
    },
    p4: {
      domainYears: 8,
      founderMarketFit: 'I spent 8 years in procurement at Salesforce. I personally felt this pain daily.',
      priorExits: 1,
      teamCoverage: ['tech', 'sales', 'product', 'finance'],
      teamCohesionMonths: 18,
    },
    p5: {
      climateLeverage: undefined,
      socialImpact: undefined,
    },
  }
}

// ── Test: Constant denominator invariant ──────────────────────────────────────

test('constant denominator: Σ/150 regardless of exclusions', () => {
  const data = baseData()
  const result = calculateIQScore(data, 'growth', 'b2b_saas')

  // Denominator must always be 150 (30 × 5)
  const totalRaw = result.parameters.flatMap(p => p.indicators).reduce((s, i) => s + i.rawScore, 0)
  const expectedFinalIQ = (totalRaw / 150) * 100
  expect(Math.abs(result.finalIQ - expectedFinalIQ)).toBeLessThan(0.2)
})

// ── Test: Pre-product stage excludes P6 ──────────────────────────────────────

test('pre-product stage: all P6 rawScore=0, still counted in denominator', () => {
  const data = baseData()
  data.financial = { monthlyBurn: 5000 }  // no MRR
  data.hasPayingCustomers = false
  data.conversationCount = 2

  const result = calculateIQScore(data, 'early', 'b2b_saas')

  const p6 = result.parameters.find(p => p.id === 'p6')!
  expect(p6.indicators.every(i => i.excluded || i.rawScore === 0)).toBe(true)

  // Final IQ uses /150, not /125
  const totalRaw = result.parameters.flatMap(p => p.indicators).reduce((s, i) => s + i.rawScore, 0)
  const expected = (totalRaw / 150) * 100
  expect(Math.abs(result.finalIQ - expected)).toBeLessThan(0.2)
  expect(result.indicatorsExcluded).toBeGreaterThan(0)
})

// ── Test: Commercial track excludes P5 ───────────────────────────────────────

test('commercial track: P5 all excluded, still in denominator', () => {
  const data = baseData()
  const result = calculateIQScore(data, 'mid', 'b2b_saas', 'commercial')

  const p5 = result.parameters.find(p => p.id === 'p5')!
  expect(p5.indicators.every(i => i.excluded)).toBe(true)
  expect(result.track).toBe('commercial')

  // P5 excluded means 5 indicators have rawScore=0 but denominator is still 150
  const totalRaw = result.parameters.flatMap(p => p.indicators).reduce((s, i) => s + i.rawScore, 0)
  expect(Math.abs(result.finalIQ - (totalRaw / 150) * 100)).toBeLessThan(0.2)
})

// ── Test: Impact track scores P5 ─────────────────────────────────────────────

test('impact track: P5 is scored', () => {
  const data = baseData()
  data.p5 = {
    climateLeverage: 'We reduce carbon emissions by 30% per procurement cycle vs baseline. Measurable via scope 3.',
    socialImpact: 'Improving supply chain efficiency reduces food waste by 20% in partner networks.',
    revenueImpactLink: 'Each transaction is tied directly to SDG 12 (responsible consumption).',
    scalingMechanism: 'Every dollar of revenue reduces waste proportionally.',
    viksitBharatAlignment: 'Aligned with Make in India and Atmanirbhar Bharat — supporting domestic procurement.',
  }

  const result = calculateIQScore(data, 'growth', 'climate', 'impact')

  const p5 = result.parameters.find(p => p.id === 'p5')!
  expect(p5.indicators.some(i => i.rawScore > 0)).toBe(true)
  expect(result.track).toBe('impact')
})

// ── Test: MRR $15K mid-stage → 6.1 score ~3.5 ────────────────────────────────

test('MRR $15K mid-stage → 6.1 Revenue Scale ~3.5', () => {
  const data = baseData()
  data.financial = { mrr: 15_000, arr: 180_000, monthlyBurn: 5000, runway: 12, cogs: 2000 }

  const result = calculateIQScore(data, 'mid', 'b2b_saas')
  const p6 = result.parameters.find(p => p.id === 'p6')!
  const ind61 = p6.indicators.find(i => i.id === '6.1')!

  expect(ind61.excluded).toBe(false)
  expect(ind61.rawScore).toBeGreaterThanOrEqual(3.0)
  expect(ind61.rawScore).toBeLessThanOrEqual(4.0)
})

// ── Test: Score bounds ────────────────────────────────────────────────────────

test('finalIQ is between 0 and 100', () => {
  const data = baseData()
  const result = calculateIQScore(data, 'mid', 'b2b_saas')
  expect(result.finalIQ).toBeGreaterThanOrEqual(0)
  expect(result.finalIQ).toBeLessThanOrEqual(100)
})

test('availableIQ >= finalIQ (non-excluded indicators always score higher)', () => {
  const data = baseData()
  data.financial = { monthlyBurn: 5000 }
  data.hasPayingCustomers = false

  const result = calculateIQScore(data, 'early', 'b2b_saas')
  expect(result.availableIQ).toBeGreaterThanOrEqual(result.finalIQ)
})

// ── Test: Sector fallback ─────────────────────────────────────────────────────

test('unknown sector falls back to default weights without error', () => {
  const data = baseData()
  expect(() => calculateIQScore(data, 'mid', 'unknown_sector_xyz')).not.toThrow()
  const result = calculateIQScore(data, 'mid', 'unknown_sector_xyz')
  expect(result.finalIQ).toBeGreaterThan(0)
})

// ── Test: inferStage ─────────────────────────────────────────────────────────

test('inferStage maps correctly', () => {
  expect(inferStage('idea')).toBe('early')
  expect(inferStage('pre-product')).toBe('early')
  expect(inferStage('mvp')).toBe('early')
  expect(inferStage('launched')).toBe('mid')
  expect(inferStage('growing')).toBe('growth')
  expect(inferStage('series-a')).toBe('growth')
  expect(inferStage('unknown')).toBe('mid')
})

// ── Test: normalizeSector ─────────────────────────────────────────────────────

test('normalizeSector maps known sectors', () => {
  expect(normalizeSector('b2b_saas')).toBe('b2b_saas')
  expect(normalizeSector('SaaS B2B')).toBe('b2b_saas')
  expect(normalizeSector('fintech')).toBe('fintech')
  expect(normalizeSector('climate tech')).toBe('climate')
  expect(normalizeSector('')).toBe('default')
})

// ── Test: 30 indicators total ─────────────────────────────────────────────────

test('exactly 30 indicators are returned', () => {
  const data = baseData()
  const result = calculateIQScore(data, 'mid', 'b2b_saas')
  const total = result.parameters.flatMap(p => p.indicators).length
  expect(total).toBe(30)
})

// ── Test: rawScore format (0.5 steps) ─────────────────────────────────────────

test('all rawScores are in 0.5 increments', () => {
  const data = baseData()
  const result = calculateIQScore(data, 'mid', 'b2b_saas')
  for (const param of result.parameters) {
    for (const ind of param.indicators) {
      // Score is either 0 (excluded) or 1.0–5.0 in 0.5 steps
      if (ind.rawScore > 0) {
        const remainder = ind.rawScore % 0.5
        expect(remainder).toBeCloseTo(0, 5)
      }
    }
  }
})
