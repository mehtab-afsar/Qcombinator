/**
 * lib/rhythm/trigger.ts — the shared after()/fetch/secret self-chain hand-off (previously
 * copy-pasted three times across app/api/rhythm/run, app/api/rhythm/step, app/api/cron/rhythm),
 * and startCycleIfDue, the confirm route's F09-Activation trigger (PRD §4, "the spine").
 */

process.env.INTERNAL_RUN_SECRET = 'test-run-secret'

const mockCreateOrResumeRun = jest.fn()
jest.mock('@/lib/rhythm/runs', () => {
  const actual = jest.requireActual('@/lib/rhythm/runs')
  return { ...actual, createOrResumeRun: mockCreateOrResumeRun }
})
jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

// Same stub as rhythm-step-route.test.ts — after() has no request-scope AsyncLocalStorage
// under plain Jest, so just invoke the callback so the hand-off is still exercised (and
// awaited) in tests.
const mockAfter = jest.fn((cb: () => Promise<void> | void) => cb())
jest.mock('next/server', () => ({ after: mockAfter }))

const mockFetch = jest.fn().mockResolvedValue({ ok: true })
global.fetch = mockFetch as unknown as typeof fetch

import { triggerNextRhythmStep, startCycleIfDue } from '@/lib/rhythm/trigger'
import { CycleAlreadyRanError, StepLimitOpenError } from '@/lib/rhythm/runs'
import { log } from '@/lib/logger'

const RUN_ID = '11111111-1111-4111-8111-111111111111'
const FOUNDER_ID = 'f1'
const CONTRACT_ID = 'c1'

beforeEach(() => jest.clearAllMocks())

describe('triggerNextRhythmStep', () => {
  it('fires the internal step route with the runId and the secret header', async () => {
    triggerNextRhythmStep(RUN_ID)
    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rhythm/step'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-run-secret': 'test-run-secret' }),
        body: JSON.stringify({ runId: RUN_ID }),
      }),
    )
  })

  it('logs and swallows a delivery failure rather than throwing into the caller', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    expect(() => triggerNextRhythmStep(RUN_ID)).not.toThrow()
    // after()'s callback is async — let it settle before asserting the catch ran.
    await new Promise(r => setTimeout(r, 0))
    expect(log.error).toHaveBeenCalledWith('rhythm step trigger failed', expect.objectContaining({ runId: RUN_ID }))
  })
})

describe('startCycleIfDue', () => {
  it('creates/resumes the run then triggers the next step', async () => {
    mockCreateOrResumeRun.mockResolvedValue({ id: RUN_ID })
    await startCycleIfDue({} as never, { founderId: FOUNDER_ID, contractId: CONTRACT_ID })
    expect(mockCreateOrResumeRun).toHaveBeenCalledWith({}, expect.objectContaining({ founderId: FOUNDER_ID, contractId: CONTRACT_ID }))
    expect(mockAfter).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/rhythm/step'), expect.anything())
  })

  it('swallows CycleAlreadyRanError — a cycle already settled this week is not a confirm failure', async () => {
    mockCreateOrResumeRun.mockRejectedValue(new CycleAlreadyRanError('2026-W32'))
    await expect(startCycleIfDue({} as never, { founderId: FOUNDER_ID, contractId: CONTRACT_ID })).resolves.toBeUndefined()
    expect(mockAfter).not.toHaveBeenCalled()
  })

  it('swallows StepLimitOpenError — the breaker being open this week is not a confirm failure', async () => {
    mockCreateOrResumeRun.mockRejectedValue(new StepLimitOpenError('2026-W32'))
    await expect(startCycleIfDue({} as never, { founderId: FOUNDER_ID, contractId: CONTRACT_ID })).resolves.toBeUndefined()
    expect(mockAfter).not.toHaveBeenCalled()
  })

  it('logs and swallows any other error too — triggering must never fail a successful confirm', async () => {
    mockCreateOrResumeRun.mockRejectedValue(new Error('db exploded'))
    await expect(startCycleIfDue({} as never, { founderId: FOUNDER_ID, contractId: CONTRACT_ID })).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalledWith('startCycleIfDue failed', expect.objectContaining({ founderId: FOUNDER_ID }))
  })
})
