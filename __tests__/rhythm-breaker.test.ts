/**
 * F10 — the circuit breaker. Every step of a cycle is a PAID Claude call that self-schedules the
 * next one, so a bug in "what's next" would bill forever. These tests exist to prove the fuse
 * actually blows, that it never blows on a healthy run, and — the important one — that it works
 * even when the thing that's broken is progress-recording itself.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

jest.mock('@/lib/mandate/contract', () => ({
  getCurrentContract: jest.fn(),
  getProgramsForContract: jest.fn(),
}))
jest.mock('@/lib/mandate/strategy', () => ({ getCurrentStrategy: jest.fn() }))
jest.mock('@/lib/assets/versioning', () => ({ getCurrentAsset: jest.fn() }))
jest.mock('@/lib/briefings/generate', () => ({ generateBriefing: jest.fn() }))
jest.mock('@/lib/rhythm/judge', () => ({ generateAssetContent: jest.fn() }))
jest.mock('@/lib/rhythm/delta', () => ({ collectCycleDelta: jest.fn() }))
jest.mock('@/lib/rhythm/runs', () => {
  const actual = jest.requireActual('@/lib/rhythm/runs')
  return {
    ...actual,
    createOrResumeRun: jest.fn(),
    getRun: jest.fn(),
    recordStep: jest.fn(),
    finishRun: jest.fn(),
    getLastCompletedRun: jest.fn(),
    claimStep: jest.fn(),
  }
})

import { runCycle, runNextStep } from '@/lib/rhythm/run'
import { createOrResumeRun, getRun, recordStep, finishRun, getLastCompletedRun, claimStep } from '@/lib/rhythm/runs'
import { maxStepsForRun, STEP_LIMIT_EXCEEDED, STEP_MARGIN } from '@/lib/rhythm/limits'
import { generateAssetContent } from '@/lib/rhythm/judge'
import { collectCycleDelta } from '@/lib/rhythm/delta'
import { generateBriefing } from '@/lib/briefings/generate'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import { getCurrentAsset } from '@/lib/assets/versioning'
import { getProgram } from '@/lib/registry'

const admin = {} as unknown as SupabaseClient
const P001_ASSETS = getProgram('P001').assets.length
/** 5 assets + 1 briefing + the terminal pass that calls finishRun. Verified against run.ts. */
const HAPPY_PATH_STEPS = P001_ASSETS + 2

const m = (fn: unknown) => fn as jest.Mock

const contract = () => ({
  id: 'c1', founderId: 'f1', status: 'confirmed', activePrograms: ['P001'],
  priorities: ['ship'], successMetrics: ['m'], responsibilities: [],
  epoch: 1, version: 1, isCurrent: true, strategyId: 's1',
  previousContractId: null, confirmedAt: 'x', createdAt: 'x', document: null,
})
const activeP001 = {
  id: 'prog1', contractId: 'c1', templateId: 'P001', owner: 'growth',
  objective: 'o', successMetric: 's', status: 'active',
}

let runStore: {
  id: string; founderId: string; cycleKey: string; status: string
  stages: Record<string, unknown>; stepCount: number; failureReason: string | null
}

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentContract).mockResolvedValue(contract())
  m(getCurrentStrategy).mockResolvedValue({ mission: 'M', priorities: [], goals: [] })
  m(getProgramsForContract).mockResolvedValue([activeP001])
  m(getCurrentAsset).mockResolvedValue(null)
  m(getLastCompletedRun).mockResolvedValue(null)
  m(collectCycleDelta).mockResolvedValue({ digest: '- edited AS001', hasNewInput: true })
  m(generateAssetContent).mockResolvedValue({ id: 'v1', content: 'doc' })
  m(generateBriefing).mockResolvedValue({ id: 'b1' })

  runStore = {
    id: 'run1', founderId: 'f1', cycleKey: '2026-W30', status: 'running',
    stages: {}, stepCount: 0, failureReason: null,
  }
  m(createOrResumeRun).mockResolvedValue(runStore)
  m(getRun).mockImplementation(async () => ({ ...runStore }))
  m(recordStep).mockImplementation(async (_a: unknown, _id: string, stages: Record<string, unknown>) => {
    runStore.stages = stages
  })
  m(claimStep).mockImplementation(async (_a: unknown, _id: string, expected: number) => {
    if (runStore.stepCount !== expected) return null
    runStore.stepCount += 1
    return runStore.stepCount
  })
  m(finishRun).mockImplementation(
    async (_a: unknown, _id: string, o: { status: string; stages: Record<string, unknown>; failureReason?: string }) => {
      runStore.status = o.status
      runStore.stages = o.stages
      runStore.failureReason = o.failureReason ?? null
    },
  )
})

// ─── The ceiling itself (pure) ────────────────────────────────────────────────

describe('maxStepsForRun', () => {
  it('is derived from the Registry, never a hardcoded number', () => {
    // If P001 gains an asset, the ceiling must move with it — no magic 12.
    expect(maxStepsForRun(['P001'])).toBe(P001_ASSETS + 1 + 1 + STEP_MARGIN)
  })

  it('leaves comfortable headroom above the real happy path', () => {
    // The guard against someone "tidying" the margin down until the breaker fires on healthy runs.
    expect(maxStepsForRun(['P001'])).toBeGreaterThan(HAPPY_PATH_STEPS)
  })

  it('scales with the number of programs', () => {
    expect(maxStepsForRun(['P001', 'P001'])).toBe(maxStepsForRun(['P001'])) // deduped
  })

  it('an unknown Program degrades to a generous budget, never 0 and never a throw', () => {
    // activePrograms is DATA on a confirmed contract; the Registry is code. A Registry change
    // must not false-trip a real founder's cycle.
    expect(() => maxStepsForRun(['P999'])).not.toThrow()
    expect(maxStepsForRun(['P999'])).toBeGreaterThan(HAPPY_PATH_STEPS)
  })

  it('is MONOTONIC — pausing a Program mid-run cannot shrink the budget under it', () => {
    // Otherwise a nearly-finished run that already spent steps on P001 would false-trip the
    // moment P001 left the active set.
    expect(maxStepsForRun([], ['P001'])).toBe(maxStepsForRun(['P001'], ['P001']))
    expect(maxStepsForRun([], ['P001'])).toBeGreaterThan(HAPPY_PATH_STEPS)
  })

  it('a contract with no programs still affords the terminal pass', () => {
    expect(maxStepsForRun([])).toBeGreaterThanOrEqual(1)
  })
})

// ─── The happy path must never trip ───────────────────────────────────────────

describe('the breaker never fires on a healthy run', () => {
  it('a normal cycle completes well inside its ceiling', async () => {
    const result = await runCycle(admin, { founderId: 'f1' })

    expect(result.status).toBe('completed')
    expect(runStore.stepCount).toBe(HAPPY_PATH_STEPS)
    expect(runStore.stepCount).toBeLessThan(maxStepsForRun(['P001']))
    expect(runStore.failureReason).toBeNull()
  })

  it('the ADR-028 no-change week also stays inside the ceiling', async () => {
    // A skipped asset still costs a step even though no Claude call happens.
    m(collectCycleDelta).mockResolvedValue({ digest: undefined, hasNewInput: false })
    m(getCurrentAsset).mockResolvedValue({ content: 'existing' })

    const result = await runCycle(admin, { founderId: 'f1' })
    expect(result.status).toBe('completed')
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
    expect(runStore.stepCount).toBeLessThan(maxStepsForRun(['P001']))
  })
})

// ─── The fuse blows ───────────────────────────────────────────────────────────

describe('the breaker trips at the ceiling', () => {
  it('fails the run with a machine-readable reason and stops the chain', async () => {
    runStore.stepCount = maxStepsForRun(['P001'])

    const step = await runNextStep(admin, runStore.id)

    // done:true is what the step route reads to NOT self-schedule again.
    expect(step.done).toBe(true)
    expect(runStore.status).toBe('failed')
    expect(runStore.failureReason).toBe(STEP_LIMIT_EXCEEDED)
  })

  it('the tripping step costs nothing — no asset call, no briefing call', async () => {
    runStore.stepCount = maxStepsForRun(['P001'])
    await runNextStep(admin, runStore.id)

    expect(m(generateAssetContent)).not.toHaveBeenCalled()
    expect(m(generateBriefing)).not.toHaveBeenCalled()
    expect(m(claimStep)).not.toHaveBeenCalled() // over budget → don't even reserve
  })

  it('losing the claim race stops this invocation without failing the run', async () => {
    // Another live invocation already took this step number. Dropping out is correct; failing
    // the run would punish the founder for a harmless fork.
    m(claimStep).mockResolvedValue(null)

    const step = await runNextStep(admin, runStore.id)
    expect(step.done).toBe(true)
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
    expect(m(finishRun)).not.toHaveBeenCalled()
    expect(runStore.status).toBe('running') // untouched
  })

  it('an already-terminal run does no work and reserves no budget', async () => {
    runStore.status = 'completed'
    const step = await runNextStep(admin, runStore.id)

    expect(step.done).toBe(true)
    expect(m(claimStep)).not.toHaveBeenCalled()
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
  })
})

// ─── The test that justifies the whole design ─────────────────────────────────

describe('a genuine runaway is bounded', () => {
  it('terminates even when progress NEVER persists — the exact bug class', async () => {
    // Simulate the failure the breaker exists for: steps run, but `stages` never advances, so
    // "what's next" returns the same work forever.
    //
    // ⚠️ This test HANGS FOREVER if the counter is ever moved into the `stages` jsonb, because
    // the counter would then be just as stuck as the progress. That is precisely why it lives
    // in its own column, claimed before any generation.
    m(recordStep).mockResolvedValue(undefined) // a no-op: progress is written nowhere

    const result = await runCycle(admin, { founderId: 'f1' })

    expect(result.status).toBe('failed')
    expect(runStore.failureReason).toBe(STEP_LIMIT_EXCEEDED)
    // Bounded spend is the actual guarantee — not merely "it stopped".
    expect(m(generateAssetContent).mock.calls.length).toBeLessThanOrEqual(maxStepsForRun(['P001']))
  }, 10_000)
})
