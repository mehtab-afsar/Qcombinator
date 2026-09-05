/**
 * lib/rhythm/context.ts::buildContext() — the single choke point where CompanyContext gets
 * assembled for every live Asset/Action generation. Covers the comparableCohort wiring
 * (RAG Phase 1), marketSignals wiring (RAG Phase 3), and qScore wiring (the reconnection —
 * every real cycle used to run blind to the founder's own Q-Score despite P001's own
 * instructions saying to check it): all three must flow through when present, be absent when
 * not, and a failure in any lookup must never break context assembly overall.
 */

const mockGetCurrentStrategy = jest.fn()
jest.mock('@/lib/mandate/strategy', () => ({ getCurrentStrategy: mockGetCurrentStrategy }))

const mockGetComparableCohortContext = jest.fn()
jest.mock('@/lib/comparables/retrieve', () => ({ getComparableCohortContext: mockGetComparableCohortContext }))

const mockGetMarketSignalContext = jest.fn()
jest.mock('@/lib/comparables/market-signals', () => ({ getMarketSignalContext: mockGetMarketSignalContext }))

const mockGetLatestScoreSummary = jest.fn()
const mockGetScoreHistory = jest.fn()
jest.mock('@/features/qscore/services/latest-score', () => ({
  getLatestScoreSummary: mockGetLatestScoreSummary,
  getScoreHistory: mockGetScoreHistory,
}))

import { buildContext } from '@/lib/rhythm/context'
import type { ExecutiveContract } from '@/lib/mandate/contract'

const FOUNDER_ID = 'f1'
const contract = (): ExecutiveContract => ({
  id: 'c1',
  status: 'confirmed',
  activePrograms: ['P001'],
  priorities: [],
  successMetrics: [],
} as unknown as ExecutiveContract)

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCurrentStrategy.mockResolvedValue(null)
  mockGetMarketSignalContext.mockResolvedValue(null)
  mockGetLatestScoreSummary.mockResolvedValue(null)
  mockGetScoreHistory.mockResolvedValue([])
})

describe('buildContext — comparableCohort wiring', () => {
  it('includes comparableCohort when the retrieval function returns text', async () => {
    mockGetComparableCohortContext.mockResolvedValue('Founders in a similar sector and stage...')
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(mockGetComparableCohortContext).toHaveBeenCalledWith({}, FOUNDER_ID)
    expect(ctx.comparableCohort).toBe('Founders in a similar sector and stage...')
  })

  it('omits comparableCohort when the retrieval function returns null', async () => {
    mockGetComparableCohortContext.mockResolvedValue(null)
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.comparableCohort).toBeUndefined()
  })

  it('does not break context assembly if the comparable-cohort lookup throws', async () => {
    mockGetComparableCohortContext.mockRejectedValue(new Error('db hiccup'))
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.comparableCohort).toBeUndefined()
    expect(ctx.currentDate).toBeTruthy() // the rest of context assembly still succeeded
  })
})

describe('buildContext — marketSignals wiring', () => {
  it('includes marketSignals when the retrieval function returns text', async () => {
    mockGetComparableCohortContext.mockResolvedValue(null)
    mockGetMarketSignalContext.mockResolvedValue('Recent third-party news (unverified...)')
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(mockGetMarketSignalContext).toHaveBeenCalledWith({}, FOUNDER_ID)
    expect(ctx.marketSignals).toBe('Recent third-party news (unverified...)')
  })

  it('omits marketSignals when the retrieval function returns null', async () => {
    mockGetComparableCohortContext.mockResolvedValue(null)
    mockGetMarketSignalContext.mockResolvedValue(null)
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.marketSignals).toBeUndefined()
  })

  it('does not break context assembly if the market-signals lookup throws', async () => {
    mockGetComparableCohortContext.mockResolvedValue(null)
    mockGetMarketSignalContext.mockRejectedValue(new Error('feed down'))
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.marketSignals).toBeUndefined()
    expect(ctx.currentDate).toBeTruthy()
  })
})

describe('buildContext — qScore wiring (the reconnection)', () => {
  it('includes the score summary and history when both are available', async () => {
    mockGetLatestScoreSummary.mockResolvedValue({ overall: 62, summary: 'Weakest: Market Potential (32).' })
    mockGetScoreHistory.mockResolvedValue([{ overall: 55, calculatedAt: '2026-08-01T00:00:00Z' }, { overall: 62, calculatedAt: '2026-08-20T00:00:00Z' }])
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(mockGetLatestScoreSummary).toHaveBeenCalledWith({}, FOUNDER_ID)
    expect(ctx.qScore).toEqual({
      overall: 62,
      summary: 'Weakest: Market Potential (32).',
      history: [{ overall: 55, calculatedAt: '2026-08-01T00:00:00Z' }, { overall: 62, calculatedAt: '2026-08-20T00:00:00Z' }],
    })
  })

  it('omits history when none exists, but still includes the summary', async () => {
    mockGetLatestScoreSummary.mockResolvedValue({ overall: 40, summary: '' })
    mockGetScoreHistory.mockResolvedValue([])
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.qScore).toEqual({ overall: 40, summary: '', history: undefined })
  })

  it('a founder never scored yet gets no qScore field — the cycle still runs', async () => {
    mockGetLatestScoreSummary.mockResolvedValue(null)
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.qScore).toBeUndefined()
    expect(ctx.currentDate).toBeTruthy()
  })

  it('does not break context assembly if the score lookup throws', async () => {
    mockGetLatestScoreSummary.mockRejectedValue(new Error('db hiccup'))
    mockGetScoreHistory.mockRejectedValue(new Error('db hiccup'))
    const ctx = await buildContext({} as never, FOUNDER_ID, contract())
    expect(ctx.qScore).toBeUndefined()
    expect(ctx.currentDate).toBeTruthy()
  })
})
