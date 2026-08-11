/**
 * POST /api/executive/[executiveId]/chat — CANVAS_SPEC §4.6's chat rail.
 *
 * Covers: Zod rejection, no-mandate/no-owned-program rejection, the "initiate" branch calling
 * the EXISTING /api/rhythm/run rather than reimplementing it, and the model's steer/unanswerable
 * decline sentinels surfacing as an honest `declined` result rather than a fabricated answer.
 */

const mockVerifyAuth = jest.fn()
jest.mock('@/lib/auth/verify', () => ({ verifyAuth: mockVerifyAuth }))

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => ({})) }))

const mockGetCurrentContract = jest.fn()
const mockGetProgramsForContract = jest.fn()
jest.mock('@/lib/mandate/contract', () => ({
  getCurrentContract: (...args: unknown[]) => mockGetCurrentContract(...args),
  getProgramsForContract: (...args: unknown[]) => mockGetProgramsForContract(...args),
}))

const mockGetActivityForExecutive = jest.fn()
jest.mock('@/lib/activity/log', () => ({
  getActivityForExecutive: (...args: unknown[]) => mockGetActivityForExecutive(...args),
}))

const mockGetBriefings = jest.fn()
jest.mock('@/lib/briefings/briefings', () => {
  const actual = jest.requireActual('@/lib/briefings/briefings')
  return { ...actual, getBriefings: (...args: unknown[]) => mockGetBriefings(...args) }
})

// Team Management, Phase 2: the route resolves the team's shared anchor founder_id before
// reading anything. Mocked to resolve to the caller's own id — these tests are all
// single-founder scenarios (no team involved), so anchorId === auth.user.id here.
const mockGetAnchorFounderId = jest.fn()
jest.mock('@/lib/team/founder-permissions', () => ({
  getAnchorFounderId: (...args: unknown[]) => mockGetAnchorFounderId(...args),
}))

const mockRoutedText = jest.fn()
jest.mock('@/lib/llm/router', () => ({ routedText: (...args: unknown[]) => mockRoutedText(...args) }))

jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

import { POST } from '@/app/api/executive/[executiveId]/chat/route'

const USER = { id: 'founder-1' }
const OWNED_PROGRAM = { id: 'prog-row-1', contractId: 'c1', templateId: 'P001', owner: 'growth', objective: 'GTM', successMetric: '', status: 'active' as const }

function request(body: unknown): Request {
  return new Request('https://example.com/api/executive/growth/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function call(body: unknown) {
  return POST(request(body) as never, { params: Promise.resolve({ executiveId: 'growth' }) })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockVerifyAuth.mockResolvedValue({ ok: true, user: USER })
  mockGetAnchorFounderId.mockResolvedValue(USER.id)
  mockGetCurrentContract.mockResolvedValue({ id: 'c1', status: 'confirmed' })
  mockGetProgramsForContract.mockResolvedValue([OWNED_PROGRAM])
  mockGetActivityForExecutive.mockResolvedValue([])
  mockGetBriefings.mockResolvedValue([])
})

describe('validation and ownership', () => {
  it('400s on an empty message', async () => {
    const res = await call({ message: '' })
    expect(res.status).toBe(400)
  })

  it('400s on a message over 500 chars', async () => {
    const res = await call({ message: 'x'.repeat(501) })
    expect(res.status).toBe(400)
  })

  it('401s when unauthenticated', async () => {
    mockVerifyAuth.mockResolvedValue({ ok: false, error: 'no session', status: 401 })
    const res = await call({ message: 'why did the ICP change?' })
    expect(res.status).toBe(401)
  })

  it('400s when there is no confirmed mandate', async () => {
    mockGetCurrentContract.mockResolvedValue(null)
    const res = await call({ message: 'why did the ICP change?' })
    expect(res.status).toBe(400)
  })

  it('400s when this executive owns no active program in the current mandate', async () => {
    mockGetProgramsForContract.mockResolvedValue([{ ...OWNED_PROGRAM, owner: 'finance' }])
    const res = await call({ message: 'why did the ICP change?' })
    expect(res.status).toBe(400)
    expect(mockRoutedText).not.toHaveBeenCalled()
  })
})

describe('"initiate" — reuses the existing rhythm run route, never reimplements it', () => {
  it('calls POST /api/rhythm/run rather than the rhythm engine directly, and never calls the LLM', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ runId: 'run-1', cycleKey: '2026-W32', done: false }) })
    const res = await call({ message: 'run the cycle now' })
    const body = await res.json()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toContain('/api/rhythm/run')
    expect(mockRoutedText).not.toHaveBeenCalled()
    expect(body).toEqual({ kind: 'initiated', runId: 'run-1', cycleKey: '2026-W32' })
  })

  it('surfaces a failed trigger (e.g. already ran this week) as an honest decline, not a raw error', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'This week already ran.' }) })
    const res = await call({ message: 'please run this now' })
    const body = await res.json()
    expect(body).toEqual({ kind: 'declined', reason: 'This week already ran.' })
  })
})

describe('a real question — grounded in fenced data, one LLM call, no side effect', () => {
  it('returns the model\'s answer as-is when it is a normal reply', async () => {
    mockRoutedText.mockResolvedValue('Positioning was reworked after the ICP narrowed to mid-market.')
    const res = await call({ message: 'why did positioning change?' })
    const body = await res.json()
    expect(body).toEqual({ kind: 'answer', text: 'Positioning was reworked after the ICP narrowed to mid-market.' })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('the two decline sentinels — never a fabricated answer or a fake acknowledgment', () => {
  it('a steer-shaped request declines honestly instead of pretending to pause anything', async () => {
    mockRoutedText.mockResolvedValue('{"decline":"steer"}')
    const res = await call({ message: 'hold the outreach' })
    const body = await res.json()
    expect(body.kind).toBe('declined')
    expect(body.reason).toMatch(/approve or decline/i)
  })

  it('an unanswerable question declines rather than inventing something', async () => {
    mockRoutedText.mockResolvedValue('{"decline":"unanswerable"}')
    const res = await call({ message: 'what will next quarter look like?' })
    const body = await res.json()
    expect(body.kind).toBe('declined')
  })
})
