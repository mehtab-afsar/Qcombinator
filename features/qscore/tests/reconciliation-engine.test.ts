/**
 * Edge Alpha Q-Score v2 — Unit Tests: Reconciliation Engine
 * Tests that:
 * 1. rawScore is NEVER changed by reconciliation
 * 2. Only vcAlert and confidence are adjusted
 * 3. Timeout/error → applied=false, submission continues
 * 4. Deviation tiers map correctly
 * 5. applyReconciliationFlags does not mutate rawScore
 */

import { applyReconciliationFlags } from '@/lib/profile-builder/reconciliation-engine'
import type { ReconciliationResult } from '@/lib/profile-builder/reconciliation-engine'
import type { IndicatorScore } from '../types/qscore.types'

// Mock the LLM layer so no real API calls are made.
//
// This MUST mock @/lib/llm/router. The engine calls routedText
// (reconciliation-engine.ts:19,140) and does not call callClaude at all. These
// tests previously mocked @/lib/claude — an inert mock that intercepted
// nothing, so the real network call ran, failed without an API key, and the
// non-blocking error path returned applied:false. See PHASE0_AUDIT.md §8.
jest.mock('@/lib/llm/router', () => ({
  routedText: jest.fn(),
}))

// Mock cache to prevent cross-test pollution
jest.mock('@/lib/cache/qscore-cache', () => ({
  getCachedReconciliation: jest.fn().mockReturnValue(null),
  setCachedReconciliation: jest.fn(),
  getCachedSectorWeights: jest.fn().mockReturnValue(null),
  setCachedSectorWeights: jest.fn(),
}))

import { routedText } from '@/lib/llm/router'
import { reconcileIndicators } from '@/lib/profile-builder/reconciliation-engine'
import type { AssessmentData } from '../types/qscore.types'

const mockedRoutedText = routedText as jest.Mock

/**
 * routedText(taskClass, messages, overrides) — messages is the SECOND argument.
 * Helper so each test reads the system prompt without re-stating the signature.
 */
type LlmMessage = { role: string; content: string }
function mockLlmBySystemPrompt(respond: (systemPrompt: string) => string): void {
  mockedRoutedText.mockImplementation((_taskClass: string, messages: LlmMessage[]) =>
    Promise.resolve(respond(messages?.[0]?.content ?? '')),
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeIndicator(id: string, rawScore: number): IndicatorScore {
  return {
    id,
    name: `Indicator ${id}`,
    rawScore,
    excluded: false,
    dataQuality: {
      source: 'founder_claim',
      verificationLevel: 'unverified',
      confidence: 0.60,
      reasons: ['initial'],
    },
  }
}

function baseData(): AssessmentData {
  return {
    problemStory: 'Enterprise procurement software',
    advantages: ['Proprietary data'],
    advantageExplanation: 'Domain expertise',
    hardshipStory: 'Pivoted twice',
    customerType: 'Enterprise SaaS buyers',
    conversationDate: null,
    customerQuote: 'Saves 20 hours/month',
    customerSurprise: 'Wanted integrations',
    customerCommitment: 'Signed LOI',
    conversationCount: 30,
    customerList: ['Acme Corp'],
    failedBelief: '', failedReasoning: '', failedDiscovery: '', failedChange: '',
    tested: '', buildTime: 9, measurement: '', results: '', learned: '', changed: '',
    targetCustomers: 500_000,
    lifetimeValue: 4_000,
    financial: { mrr: 15_000, arr: 180_000, monthlyBurn: 8_000 },
    p2: {
      tamDescription: 'SAM is $2B based on 500K enterprise procurement teams × $4K',
      competitorCount: 3,
      competitorDensityContext: 'Coupa, Jaggaer, SAP Ariba',
    },
    p3: {
      replicationCostUsd: 3_000_000,
      technicalDepth: 'Proprietary ML model on 10M transactions',
      buildComplexity: '12+ months',
    },
    p5: {
      climateLeverage: 'Reduces carbon by 30% per procurement cycle',
    },
  }
}

// ── applyReconciliationFlags — rawScore immutability ─────────────────────────

describe('applyReconciliationFlags', () => {
  test('rawScore is NEVER changed by reconciliation', () => {
    const indicators = [
      makeIndicator('2.1', 4.0),
      makeIndicator('2.5', 3.0),
      makeIndicator('3.5', 3.5),
      makeIndicator('5.1', 2.0),
    ]

    const results: ReconciliationResult[] = [
      {
        indicatorId: '2.1',
        founderValue: 2_000_000_000,
        aiEstimate: 500_000_000,
        deviation: 3.0,
        anomalySeverity: 'high',
        confidenceAdjustment: -0.20,
        vcAlert: 'Large SAM deviation: 300% vs AI estimate',
        applied: true,
      },
      {
        indicatorId: '2.5',
        founderValue: 3,
        aiEstimate: 25,
        deviation: 7.33,
        anomalySeverity: 'extreme',
        confidenceAdjustment: -0.30,
        vcAlert: 'Competitor count: founder says 3, AI estimates 25',
        applied: true,
      },
    ]

    const updated = applyReconciliationFlags(indicators, results)

    // rawScore must be identical
    expect(updated.find(i => i.id === '2.1')!.rawScore).toBe(4.0)
    expect(updated.find(i => i.id === '2.5')!.rawScore).toBe(3.0)
    expect(updated.find(i => i.id === '3.5')!.rawScore).toBe(3.5)  // no result → unchanged
    expect(updated.find(i => i.id === '5.1')!.rawScore).toBe(2.0)  // no result → unchanged
  })

  test('vcAlert is set from reconciliation result', () => {
    const indicators = [makeIndicator('2.1', 4.0)]
    const results: ReconciliationResult[] = [{
      indicatorId: '2.1',
      founderValue: 2_000_000_000,
      aiEstimate: 100_000_000,
      deviation: 19.0,
      anomalySeverity: 'extreme',
      confidenceAdjustment: -0.30,
      vcAlert: 'Extreme SAM claim: founder 2000000000 vs AI estimate 100000000',
      applied: true,
    }]

    const updated = applyReconciliationFlags(indicators, results)
    expect(updated[0].vcAlert).toBe('Extreme SAM claim: founder 2000000000 vs AI estimate 100000000')
  })

  test('confidence is adjusted but clamped at 0.0', () => {
    const indicators = [makeIndicator('2.5', 3.0)]
    indicators[0].dataQuality.confidence = 0.20  // low base
    const results: ReconciliationResult[] = [{
      indicatorId: '2.5',
      founderValue: 1,
      aiEstimate: 50,
      deviation: 49,
      anomalySeverity: 'extreme',
      confidenceAdjustment: -0.30,
      vcAlert: 'Competitor count mismatch',
      applied: true,
    }]

    const updated = applyReconciliationFlags(indicators, results)
    // 0.20 + (-0.30) = -0.10 → clamped to 0.0
    expect(updated[0].dataQuality.confidence).toBeGreaterThanOrEqual(0.0)
    expect(updated[0].dataQuality.confidence).toBeLessThanOrEqual(1.0)
  })

  test('non-applied results do not modify indicator', () => {
    const indicators = [makeIndicator('3.5', 3.5)]
    const originalConfidence = indicators[0].dataQuality.confidence

    const results: ReconciliationResult[] = [{
      indicatorId: '3.5',
      founderValue: 3_000_000,
      aiEstimate: null,
      deviation: null,
      anomalySeverity: 'none',
      confidenceAdjustment: 0,
      vcAlert: null,
      applied: false,  // <-- not applied
      error: 'timeout',
    }]

    const updated = applyReconciliationFlags(indicators, results)
    expect(updated[0].rawScore).toBe(3.5)
    expect(updated[0].dataQuality.confidence).toBe(originalConfidence)
    expect(updated[0].vcAlert).toBeUndefined()
  })

  test('returns same number of indicators', () => {
    const ids = ['1.1','1.2','2.1','2.5','3.5','5.1']
    const indicators = ids.map(id => makeIndicator(id, 3.0))
    const results: ReconciliationResult[] = []
    const updated = applyReconciliationFlags(indicators, results)
    expect(updated).toHaveLength(indicators.length)
  })
})

// ── reconcileIndicators — LLM mocked ─────────────────────────────────────────

describe('reconcileIndicators — LLM mocked', () => {
  beforeEach(() => {
    mockedRoutedText.mockClear()
  })

  test('returns 4 results (one per indicator)', async () => {
    mockedRoutedText.mockResolvedValue(
      JSON.stringify({ aiSamUsd: 1_000_000_000, reasoning: 'test', confidence: 0.8 })
    )

    const results = await reconcileIndicators(baseData(), 'user-123')
    expect(results).toHaveLength(4)
    expect(results.map(r => r.indicatorId)).toEqual(['2.1', '2.5', '3.5', '5.1'])
  })

  test('LLM timeout → applied=false, no throw', async () => {
    // Simulate timeout on all calls
    mockedRoutedText.mockImplementation(
      () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
    )

    const results = await reconcileIndicators(baseData(), 'user-timeout')
    for (const r of results) {
      expect(r.applied).toBe(false)
    }
  }, 10_000)

  test('LLM error → applied=false with error field', async () => {
    mockedRoutedText.mockRejectedValue(new Error('API rate limit exceeded'))

    const results = await reconcileIndicators(baseData(), 'user-error')
    for (const r of results) {
      expect(r.applied).toBe(false)
      expect(r.error).toBeDefined()
    }
  })

  test('LLM returns malformed JSON → applied=false', async () => {
    mockedRoutedText.mockResolvedValue('not valid json at all')

    const results = await reconcileIndicators(baseData(), 'user-bad-json')
    // malformed JSON causes parse error → applied=false
    for (const r of results) {
      expect(r.applied).toBe(false)
    }
  })

  test('2.5 low deviation → no vcAlert', async () => {
    // Founder says 3 competitors, AI says 4 — small deviation
    mockLlmBySystemPrompt(system =>
      system.includes('competitive intelligence')
        ? JSON.stringify({
            estimatedCompetitors: 4,
            reasoning: 'Similar to founder estimate',
            confidence: 0.85,
          })
        : JSON.stringify({ aiSamUsd: null, reasoning: 'test', confidence: 0 }),
    )

    const results = await reconcileIndicators(baseData(), 'user-low-dev')
    const r25 = results.find(r => r.indicatorId === '2.5')!
    expect(r25.applied).toBe(true)
    expect(r25.vcAlert).toBeNull()
    expect(r25.anomalySeverity).toBe('none')
  })

  test('extreme deviation on 3.5 → vcAlert set, rawScore untouched', async () => {
    // Founder says $3M replication cost, AI says $50K
    mockLlmBySystemPrompt(system =>
      system.includes('technical due diligence')
        ? JSON.stringify({
            estimatedCostUsd: 50_000,
            reasoning: 'Simple CRUD app',
            confidence: 0.80,
          })
        : JSON.stringify({ aiSamUsd: null, reasoning: 'test', confidence: 0 }),
    )

    const results = await reconcileIndicators(baseData(), 'user-extreme-35')
    const r35 = results.find(r => r.indicatorId === '3.5')!
    expect(r35.applied).toBe(true)
    expect(r35.anomalySeverity).toBe('extreme')
    expect(r35.vcAlert).toBeTruthy()
    // Verify rawScore is NOT in the reconciliation result (it's in IndicatorScore, not here)
    expect('rawScore' in r35).toBe(false)
  })
})

// ── ENABLE_RECONCILIATION env flag ────────────────────────────────────────────

describe('ENABLE_RECONCILIATION env flag', () => {
  const originalEnv = process.env.ENABLE_RECONCILIATION

  afterEach(() => {
    process.env.ENABLE_RECONCILIATION = originalEnv
  })

  test('ENABLE_RECONCILIATION=false → returns empty array', async () => {
    process.env.ENABLE_RECONCILIATION = 'false'
    // Need to re-require because the module reads env at load time
    jest.resetModules()
    const { reconcileIndicators: reconcileFresh } = await import('@/lib/profile-builder/reconciliation-engine')
    const results = await reconcileFresh(baseData(), 'user-disabled')
    expect(results).toHaveLength(0)
  })
})
