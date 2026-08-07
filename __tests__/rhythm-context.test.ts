/**
 * lib/rhythm/context.ts::buildContext() — the single choke point where CompanyContext gets
 * assembled for every live Asset/Action generation. Covers the comparableCohort wiring
 * (RAG Phase 1) and marketSignals wiring (RAG Phase 3): both must flow through when present, be
 * absent when not, and a failure in either lookup must never break context assembly overall.
 */

const mockGetCurrentStrategy = jest.fn()
jest.mock('@/lib/mandate/strategy', () => ({ getCurrentStrategy: mockGetCurrentStrategy }))

const mockGetComparableCohortContext = jest.fn()
jest.mock('@/lib/comparables/retrieve', () => ({ getComparableCohortContext: mockGetComparableCohortContext }))

const mockGetMarketSignalContext = jest.fn()
jest.mock('@/lib/comparables/market-signals', () => ({ getMarketSignalContext: mockGetMarketSignalContext }))

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
