/**
 * POST /api/connections/rationale
 *
 * Covers the caching this route was missing entirely before: a cache hit must skip the LLM
 * call, a miss must generate then upsert, `regenerate: true` must bypass the cache read, and a
 * malformed body (missing/both investor ids) must 400 via the new schema.
 */

const mockVerifyAuth = jest.fn()
jest.mock('@/lib/auth/verify', () => ({ verifyAuth: mockVerifyAuth }))

const mockGenerateMatchRationale = jest.fn()
jest.mock('@/features/matching/services/match-rationale', () => ({
  generateMatchRationale: mockGenerateMatchRationale,
}))

jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

// A minimal fake of the RLS-scoped query builder covering exactly the two shapes the route
// issues: .select(...).eq(...).eq(...).maybeSingle() for the cache read, and
// .upsert(...).then(cb) for the fire-and-forget write.
let cachedRow: { explanation: string } | null = null
const upsertSpy = jest.fn()
const mockCreateClient = jest.fn(async () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({ data: cachedRow })),
        })),
      })),
    })),
    upsert: jest.fn((row: unknown, opts: unknown) => {
      upsertSpy(row, opts)
      return { then: (cb: (r: { error: null }) => void) => { cb({ error: null }); return Promise.resolve() } }
    }),
  })),
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))

import { POST } from '@/app/api/connections/rationale/route'

const USER = { id: 'founder-1' }

function request(body: unknown): Request {
  return new Request('https://example.com/api/connections/rationale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  investorId: '11111111-1111-4111-8111-111111111111',
  investorName: 'Jane Doe',
  investorFirm: 'Acme Ventures',
  investorThesis: 'Fintech infra.',
  investorSectors: ['fintech'],
  investorStages: ['seed'],
  investorPortfolio: [],
  matchScore: 80,
  founderSector: 'fintech',
  founderStage: 'seed',
  founderQScore: 70,
}

beforeEach(() => {
  jest.clearAllMocks()
  cachedRow = null
  mockVerifyAuth.mockResolvedValue({ ok: true, user: USER })
  mockGenerateMatchRationale.mockResolvedValue('Fresh generated rationale.')
})

describe('POST /api/connections/rationale', () => {
  it('401s when unauthenticated', async () => {
    mockVerifyAuth.mockResolvedValue({ ok: false, error: 'Unauthorized', status: 401 })
    const res = await POST(request(validBody) as never)
    expect(res.status).toBe(401)
  })

  it('400s when neither investorId nor demoInvestorId is present', async () => {
    const { investorId: _drop, ...rest } = validBody
    const res = await POST(request(rest) as never)
    expect(res.status).toBe(400)
    expect(mockGenerateMatchRationale).not.toHaveBeenCalled()
  })

  it('400s when BOTH investorId and demoInvestorId are present', async () => {
    const res = await POST(request({ ...validBody, demoInvestorId: validBody.investorId }) as never)
    expect(res.status).toBe(400)
  })

  it('cache hit: returns the cached explanation without calling the LLM', async () => {
    cachedRow = { explanation: 'Cached rationale.' }
    const res = await POST(request(validBody) as never)
    const json = await res.json()

    expect(json).toEqual({ rationale: 'Cached rationale.', cached: true })
    expect(mockGenerateMatchRationale).not.toHaveBeenCalled()
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('cache miss: generates, then upserts into the cache with the right conflict target', async () => {
    cachedRow = null
    const res = await POST(request(validBody) as never)
    const json = await res.json()

    expect(json).toEqual({ rationale: 'Fresh generated rationale.', cached: false })
    expect(mockGenerateMatchRationale).toHaveBeenCalledTimes(1)
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    const [row, opts] = upsertSpy.mock.calls[0]
    expect(row.founder_id).toBe(USER.id)
    expect(row.investor_id).toBe(validBody.investorId)
    expect(row.demo_investor_id).toBeNull()
    expect(opts).toEqual({ onConflict: 'founder_id,investor_id' })
  })

  it('demo investor: upserts on the demo_investor_id conflict target, not investor_id', async () => {
    const DEMO_ID = '22222222-2222-4222-8222-222222222222'
    const { investorId: _drop, ...rest } = validBody
    await POST(request({ ...rest, demoInvestorId: DEMO_ID }) as never)

    const [row, opts] = upsertSpy.mock.calls[0]
    expect(row.investor_id).toBeNull()
    expect(row.demo_investor_id).toBe(DEMO_ID)
    expect(opts).toEqual({ onConflict: 'founder_id,demo_investor_id' })
  })

  it('regenerate: true bypasses the cache read even when a cached row exists', async () => {
    cachedRow = { explanation: 'Stale cached rationale.' }
    const res = await POST(request({ ...validBody, regenerate: true }) as never)
    const json = await res.json()

    expect(mockGenerateMatchRationale).toHaveBeenCalledTimes(1)
    expect(json.rationale).toBe('Fresh generated rationale.')
    expect(json.cached).toBe(false)
  })

  it('never sends the cache-key/regenerate fields to generateMatchRationale', async () => {
    await POST(request({ ...validBody, regenerate: false }) as never)
    const [input] = mockGenerateMatchRationale.mock.calls[0]
    expect(input).not.toHaveProperty('investorId')
    expect(input).not.toHaveProperty('demoInvestorId')
    expect(input).not.toHaveProperty('regenerate')
    expect(input.investorName).toBe('Jane Doe')
  })
})
