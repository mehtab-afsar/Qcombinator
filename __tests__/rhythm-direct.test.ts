/**
 * F09 Stage 4 — directAssetRework. Not a second engine: it must call the SAME
 * generateAssetContent the weekly cycle calls, with the founder's instruction carried as
 * context.newInformation and a synthesized direct_<uuid> execution id. Mocks the collaborators
 * (lib/mandate/contract, lib/rhythm/context, lib/rhythm/judge) rather than Supabase directly —
 * same shape as rhythm-trigger.test.ts mocking lib/rhythm/runs.
 */

const mockGetCurrentContract = jest.fn()
const mockGetProgramsForContract = jest.fn()
jest.mock('@/lib/mandate/contract', () => ({
  getCurrentContract: mockGetCurrentContract,
  getProgramsForContract: mockGetProgramsForContract,
}))

const mockBuildContext = jest.fn()
jest.mock('@/lib/rhythm/context', () => ({ buildContext: mockBuildContext }))

const mockGenerateAssetContent = jest.fn()
jest.mock('@/lib/rhythm/judge', () => ({
  generateAssetContent: mockGenerateAssetContent,
  JudgementError: class JudgementError extends Error {},
}))

import { directAssetRework } from '@/lib/rhythm/direct'
import { RhythmError } from '@/lib/rhythm/errors'

const FOUNDER_ID = 'f1'
const contract = (over: Record<string, unknown> = {}) => ({
  id: 'c1', status: 'confirmed', activePrograms: ['P001'], ...over,
})
const programInstance = (over: Record<string, unknown> = {}) => ({
  id: 'prog-uuid-1', templateId: 'P001', owner: 'growth', status: 'active', ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockBuildContext.mockResolvedValue({ strategy: 's', contract: 'c', currentDate: '2026-08-04' })
  mockGenerateAssetContent.mockResolvedValue({ id: 'v1', assetId: 'AS001', version: 3 })
})

describe('directAssetRework', () => {
  it('refuses when there is no confirmed mandate', async () => {
    mockGetCurrentContract.mockResolvedValue(null)
    await expect(directAssetRework({} as never, { founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'x' }))
      .rejects.toThrow(RhythmError)
    expect(mockGenerateAssetContent).not.toHaveBeenCalled()
  })

  it('refuses when the mandate is a draft, not confirmed', async () => {
    mockGetCurrentContract.mockResolvedValue(contract({ status: 'draft' }))
    await expect(directAssetRework({} as never, { founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'x' }))
      .rejects.toThrow(RhythmError)
  })

  it('refuses an Asset no active Program in the mandate actually produces', async () => {
    // AS001 belongs to P001 — a mandate that never activated P001 has nothing to direct.
    mockGetCurrentContract.mockResolvedValue(contract({ activePrograms: ['P999'] }))
    await expect(directAssetRework({} as never, { founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'x' }))
      .rejects.toThrow(/not produced by any Program/)
    expect(mockGenerateAssetContent).not.toHaveBeenCalled()
  })

  it('refuses when the owning Program instance is missing or paused', async () => {
    mockGetCurrentContract.mockResolvedValue(contract())
    mockGetProgramsForContract.mockResolvedValue([programInstance({ status: 'paused' })])
    await expect(directAssetRework({} as never, { founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'x' }))
      .rejects.toThrow(RhythmError)
  })

  it('calls the SAME generateAssetContent the rhythm cycle uses, not a second engine', async () => {
    mockGetCurrentContract.mockResolvedValue(contract())
    mockGetProgramsForContract.mockResolvedValue([programInstance()])

    const result = await directAssetRework({} as never, {
      founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'Sharpen the ICP',
    })

    expect(result).toEqual({ id: 'v1', assetId: 'AS001', version: 3 })
    expect(mockGenerateAssetContent).toHaveBeenCalledTimes(1)
    const [, callArgs] = mockGenerateAssetContent.mock.calls[0]
    expect(callArgs.founderId).toBe(FOUNDER_ID)
    expect(callArgs.assetId).toBe('AS001')
    expect(callArgs.program.templateId).toBe('P001')
    expect(callArgs.activePrograms).toEqual(['P001'])
    // No operating_rhythm_runs row exists for a directed rework — null, not a synthesized id
    // (a synthesized non-uuid string was tried first and rejected live: invalid uuid syntax,
    // and even a real uuid would have failed the FK to operating_rhythm_runs).
    expect(callArgs.executionId).toBeNull()
  })

  it('carries the instruction as context.newInformation — the Composer layer that already renders it', async () => {
    mockGetCurrentContract.mockResolvedValue(contract())
    mockGetProgramsForContract.mockResolvedValue([programInstance()])

    await directAssetRework({} as never, {
      founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'Sharpen the ICP',
    })

    const [, callArgs] = mockGenerateAssetContent.mock.calls[0]
    expect(callArgs.context.newInformation).toBe('Sharpen the ICP')
    expect(callArgs.context.strategy).toBe('s') // buildContext's own fields still flow through
  })

  it('marks the version as directed, not an ordinary cycle write, in updateReason', async () => {
    mockGetCurrentContract.mockResolvedValue(contract())
    mockGetProgramsForContract.mockResolvedValue([programInstance()])

    await directAssetRework({} as never, {
      founderId: FOUNDER_ID, assetId: 'AS001', instruction: 'Sharpen the ICP',
    })

    const [, callArgs] = mockGenerateAssetContent.mock.calls[0]
    expect(callArgs.updateReason).toBe('Directed: Sharpen the ICP')
  })
})
