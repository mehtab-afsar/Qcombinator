/**
 * The internal step route (F10 chunking) — the secret-auth guard, the flag gate, and that a
 * successful step self-schedules the next one while the final step does not.
 */

const mockRunNextStep = jest.fn()
jest.mock('@/lib/rhythm/run', () => {
  const actual = jest.requireActual('@/lib/rhythm/run')
  return { ...actual, runNextStep: mockRunNextStep }
})
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }))
jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

let flagOn = true
jest.mock('@/lib/feature-flags', () => ({ get FF_NEW_EXECUTIVE_MODEL() { return flagOn } }))

// after() has no request-scope AsyncLocalStorage to hook into under plain Jest — stub it to
// just invoke the callback so the self-chain trigger is still exercised (and awaited) in tests.
const mockAfter = jest.fn((cb: () => Promise<void> | void) => cb())
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return { ...actual, after: mockAfter }
})

const mockFetch = jest.fn().mockResolvedValue({ ok: true })
global.fetch = mockFetch as unknown as typeof fetch

import { POST } from '@/app/api/rhythm/step/route'

const RUN_ID = '11111111-1111-4111-8111-111111111111'
const SECRET = 'test-run-secret'

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/rhythm/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  flagOn = true
  process.env.INTERNAL_RUN_SECRET = SECRET
  mockRunNextStep.mockResolvedValue({ done: false })
})

describe('POST /api/rhythm/step — auth', () => {
  it('503s when INTERNAL_RUN_SECRET is not configured (fail closed, never fail open)', async () => {
    delete process.env.INTERNAL_RUN_SECRET
    const res = await POST(request({ runId: RUN_ID }) as never)
    expect(res.status).toBe(503)
    expect(mockRunNextStep).not.toHaveBeenCalled()
  })

  it('403s on a missing or wrong secret', async () => {
    const missing = await POST(request({ runId: RUN_ID }) as never)
    expect(missing.status).toBe(403)

    const wrong = await POST(request({ runId: RUN_ID }, { 'x-run-secret': 'nope' }) as never)
    expect(wrong.status).toBe(403)

    expect(mockRunNextStep).not.toHaveBeenCalled()
  })

  it('404s when the new model flag is off, even with a correct secret', async () => {
    flagOn = false
    const res = await POST(request({ runId: RUN_ID }, { 'x-run-secret': SECRET }) as never)
    expect(res.status).toBe(404)
    expect(mockRunNextStep).not.toHaveBeenCalled()
  })

  it('400s on an invalid body (not a UUID)', async () => {
    const res = await POST(request({ runId: 'not-a-uuid' }, { 'x-run-secret': SECRET }) as never)
    expect(res.status).toBe(400)
    expect(mockRunNextStep).not.toHaveBeenCalled()
  })
})

describe('POST /api/rhythm/step — advancing and self-chaining', () => {
  it('advances one step and self-schedules the next when not done', async () => {
    mockRunNextStep.mockResolvedValue({ done: false })
    const res = await POST(request({ runId: RUN_ID }, { 'x-run-secret': SECRET }) as never)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ runId: RUN_ID, done: false })
    expect(mockRunNextStep).toHaveBeenCalledTimes(1)
    expect(mockAfter).toHaveBeenCalledTimes(1) // self-chain scheduled
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rhythm/step'),
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-run-secret': SECRET }) }),
    )
  })

  it('does NOT self-schedule once the run is done — the chain must terminate', async () => {
    mockRunNextStep.mockResolvedValue({ done: true })
    const res = await POST(request({ runId: RUN_ID }, { 'x-run-secret': SECRET }) as never)

    expect(await res.json()).toEqual({ runId: RUN_ID, done: true })
    expect(mockAfter).not.toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('a RhythmError (run gone / mandate no longer confirmed) aborts without self-scheduling a retry', async () => {
    const { RhythmError } = jest.requireActual('@/lib/rhythm/run')
    mockRunNextStep.mockRejectedValue(new RhythmError('Run not found.'))
    const res = await POST(request({ runId: RUN_ID }, { 'x-run-secret': SECRET }) as never)

    expect(res.status).toBe(400)
    expect(mockAfter).not.toHaveBeenCalled()
  })
})
