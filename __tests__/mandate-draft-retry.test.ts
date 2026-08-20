/**
 * createDraft's retry-then-fallback behaviour. Before this, ANY MandateGenerationError —
 * a timeout, a truncated response, invalid JSON — fell straight to the deterministic
 * P001-only builder with nothing telling the founder. 7 Aug's own live verification run
 * proved this isn't hypothetical: a real S002 call truncated mid-document and hit exactly
 * this path. One retry before giving up catches the transient cases; `document` staying
 * null is what the UI now reads to tell the founder honestly when it still happened.
 */

jest.mock('@/lib/mandate/generate', () => {
  const actual = jest.requireActual('@/lib/mandate/generate')
  return { ...actual, generateMandate: jest.fn() }
})
jest.mock('@/lib/mandate/strategy', () => ({
  getCurrentStrategy: jest.fn(),
  isStrategyComplete: jest.fn(),
}))
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import type { SupabaseClient } from '@supabase/supabase-js'
import { createDraft } from '@/lib/mandate/contract'
import { generateMandate, MandateGenerationError } from '@/lib/mandate/generate'
import { getCurrentStrategy, isStrategyComplete } from '@/lib/mandate/strategy'
import { log } from '@/lib/logger'

const m = (fn: unknown) => fn as jest.Mock

const strategy = {
  id: 'strat-1', mission: 'Win mid-market procurement.',
  priorities: ['Land 10 design partners'], goals: ['£40k MRR'],
}

const goodMandate = {
  priorities: ['Land 10 design partners'],
  successMetrics: ['£40k MRR'],
  responsibilities: [{ executive: 'growth', mandate: 'Own the commercial engine' }],
  activePrograms: ['P001', 'P015'],
  document: '# Executive Contract\n\nReal reasoning.',
}

/** No existing current contract — the insert path only, no update/retire branch. */
function fakeAdmin(insertedRow: Record<string, unknown>): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: insertedRow, error: null }) }),
      }),
    }),
  } as unknown as SupabaseClient
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'draft-1', founder_id: 'f1', strategy_id: 'strat-1', epoch: 1, version: 1,
  is_current: true, status: 'draft', priorities: [], success_metrics: [], responsibilities: [],
  active_programs: ['P001'], contract_document: null, previous_contract_id: null,
  confirmed_at: null, created_at: new Date().toISOString(), ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentStrategy).mockResolvedValue(strategy)
  m(isStrategyComplete).mockReturnValue(true)
})

describe('createDraft — the happy path never retries', () => {
  it('uses the real mandate on the first try', async () => {
    m(generateMandate).mockResolvedValue(goodMandate)

    const contract = await createDraft(fakeAdmin(row({
      active_programs: goodMandate.activePrograms, contract_document: goodMandate.document,
    })), 'f1')

    expect(generateMandate).toHaveBeenCalledTimes(1)
    expect(contract.activePrograms).toEqual(['P001', 'P015'])
    expect(contract.document).toBe(goodMandate.document)
    expect(log.warn).not.toHaveBeenCalled()
  })
})

describe('createDraft — one transient failure is retried, not fallen back on', () => {
  it('a second successful call is used, and the founder never sees the thin fallback', async () => {
    m(generateMandate)
      .mockRejectedValueOnce(new MandateGenerationError('the model summary was not valid JSON'))
      .mockResolvedValueOnce(goodMandate)

    const contract = await createDraft(fakeAdmin(row({
      active_programs: goodMandate.activePrograms, contract_document: goodMandate.document,
    })), 'f1')

    expect(generateMandate).toHaveBeenCalledTimes(2)
    expect(contract.activePrograms).toEqual(['P001', 'P015'])
    expect(contract.document).toBe(goodMandate.document)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn).toHaveBeenCalledWith('S002 failed, retrying once', expect.any(Object))
  })
})

describe('createDraft — only a SECOND failure falls back, and it is honestly thin', () => {
  it('falls back to P001-only after two failures, document stays null', async () => {
    m(generateMandate)
      .mockRejectedValueOnce(new MandateGenerationError('timeout'))
      .mockRejectedValueOnce(new MandateGenerationError('timeout again'))

    const contract = await createDraft(fakeAdmin(row({ active_programs: ['P001'], contract_document: null })), 'f1')

    expect(generateMandate).toHaveBeenCalledTimes(2)
    expect(contract.activePrograms).toEqual(['P001'])
    // The one signal the UI reads (MandateReveal.tsx) to show the founder this is thin.
    expect(contract.document).toBeNull()
    expect(log.warn).toHaveBeenCalledTimes(2)
    expect(log.warn).toHaveBeenLastCalledWith(
      'S002 unavailable after retry — falling back to a deterministic draft', expect.any(Object),
    )
  })
})

describe('createDraft — a non-mandate error is never retried or swallowed', () => {
  it('a genuine crash (not MandateGenerationError) propagates immediately', async () => {
    m(generateMandate).mockRejectedValue(new Error('database connection lost'))

    await expect(createDraft(fakeAdmin(row()), 'f1')).rejects.toThrow('database connection lost')
    expect(generateMandate).toHaveBeenCalledTimes(1)
  })
})
