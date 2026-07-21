/**
 * F10 — the Operating Rhythm: the cycle-key, the orchestrator (with the LLM/DB steps mocked),
 * and the migration's guarantees. DB-free; the live LLM cycle runs only when the flag is on.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
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
  }
})

import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { runCycle, runNextStep, RhythmError } from '@/lib/rhythm/run'
import { createOrResumeRun, getRun, recordStep, finishRun, getLastCompletedRun, CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { generateAssetContent } from '@/lib/rhythm/judge'
import { collectCycleDelta } from '@/lib/rhythm/delta'
import { generateBriefing } from '@/lib/briefings/generate'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import { getCurrentAsset } from '@/lib/assets/versioning'
import { getProgram } from '@/lib/registry'
import { AssetPersistenceError } from '@/lib/assets/validation'
import { BriefingError } from '@/lib/briefings/briefings'

const admin = {} as unknown as SupabaseClient
const P001_ASSETS = getProgram('P001').assets.length // the real count the rhythm regenerates

const contract = (over = {}) => ({
  id: 'c1', founderId: 'f1', status: 'confirmed', activePrograms: ['P001'],
  priorities: ['ship'], successMetrics: ['10 partners'], responsibilities: [],
  epoch: 1, version: 1, isCurrent: true, strategyId: 's1',
  previousContractId: null, confirmedAt: 'x', createdAt: 'x', document: null, ...over,
})
const activeP001 = { id: 'prog1', contractId: 'c1', templateId: 'P001', owner: 'growth', objective: 'o', successMetric: 's', status: 'active' }

const m = (fn: unknown) => fn as jest.Mock

// A tiny in-memory fake of the run row. runNextStep's pattern — fetch fresh state, mutate,
// persist — is the whole point of chunking (real invocations share nothing but the DB row), so
// the mocks for createOrResumeRun/getRun/recordStep/finishRun all read and write this ONE store
// rather than each being an independent static mock — otherwise runCycle's synchronous loop
// (which calls runNextStep repeatedly) would lose progress between iterations here in a way it
// never would against the real database.
let runStore: { id: string; founderId: string; cycleKey: string; status: string; stages: Record<string, unknown> }

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentContract).mockResolvedValue(contract())
  m(getCurrentStrategy).mockResolvedValue({ mission: 'M', priorities: ['p'], goals: [] })
  m(getProgramsForContract).mockResolvedValue([activeP001])
  m(getCurrentAsset).mockResolvedValue({ content: 'prior version' })
  m(getLastCompletedRun).mockResolvedValue(null)
  // Default: the founder DID something this week, so regeneration proceeds (ADR-028).
  m(collectCycleDelta).mockResolvedValue({ digest: '- founder edited AS001', hasNewInput: true })
  m(generateAssetContent).mockResolvedValue({ id: 'v1' })
  m(generateBriefing).mockResolvedValue({ id: 'b1' })

  runStore = { id: 'run1', founderId: 'f1', cycleKey: '2026-W29', status: 'running', stages: {} }
  m(createOrResumeRun).mockResolvedValue(runStore)
  m(getRun).mockImplementation(async () => ({ ...runStore }))
  m(recordStep).mockImplementation(async (_admin: unknown, _id: string, stages: Record<string, unknown>) => {
    runStore.stages = stages
  })
  m(finishRun).mockImplementation(
    async (_admin: unknown, _id: string, outcome: { status: string; stages: Record<string, unknown> }) => {
      runStore.status = outcome.status
      runStore.stages = outcome.stages
    },
  )
})

describe('F10 weekCycleKey', () => {
  it('formats an ISO week as YYYY-Www', () => {
    expect(weekCycleKey(new Date('2026-07-20T00:00:00Z'))).toMatch(/^2026-W\d{2}$/)
  })
  it('is stable within a week and differs across weeks', () => {
    const a = weekCycleKey(new Date('2026-07-20T00:00:00Z')) // Monday
    const b = weekCycleKey(new Date('2026-07-24T00:00:00Z')) // same week
    const c = weekCycleKey(new Date('2026-07-27T00:00:00Z')) // next week
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('F10 runCycle', () => {
  it('runs each active Program: regenerates every Asset, then briefs → completed', async () => {
    const result = await runCycle(admin, { founderId: 'f1' })
    expect(result.status).toBe('completed')
    expect(m(generateAssetContent)).toHaveBeenCalledTimes(P001_ASSETS)
    expect(m(generateBriefing)).toHaveBeenCalledTimes(1)
    expect(m(finishRun).mock.calls[0][2].status).toBe('completed')
  })

  it('is idempotent — a duplicate week is rejected before any work', async () => {
    m(createOrResumeRun).mockRejectedValue(new CycleAlreadyRanError('2026-W29'))
    await expect(runCycle(admin, { founderId: 'f1' })).rejects.toBeInstanceOf(CycleAlreadyRanError)
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
  })

  it('refuses to run without a confirmed mandate (never creates a run)', async () => {
    m(getCurrentContract).mockResolvedValue(contract({ status: 'draft' }))
    await expect(runCycle(admin, { founderId: 'f1' })).rejects.toBeInstanceOf(RhythmError)
    expect(m(createOrResumeRun)).not.toHaveBeenCalled()
  })

  it('runs only contract-active Programs (a paused Program is skipped)', async () => {
    m(getProgramsForContract).mockResolvedValue([
      activeP001,
      { ...activeP001, id: 'prog2', templateId: 'P999', status: 'paused' },
    ])
    await runCycle(admin, { founderId: 'f1' })
    for (const call of m(generateAssetContent).mock.calls) {
      expect(call[1].program.templateId).toBe('P001') // never P999
    }
  })

  it('a failed asset stage reads FAILED (not pending), blocks the briefing, fails the run', async () => {
    m(generateAssetContent).mockRejectedValue(new Error('anthropic down'))
    const result = await runCycle(admin, { founderId: 'f1' })
    expect(result.status).toBe('failed')
    // B4: the stage that failed must SAY so — 'pending' would look like "not started".
    expect(result.stages.P001.assets).toBe('failed')
    expect(result.stages.P001.briefing).toBe('blocked')
    expect(result.stages.P001.error).toMatch(/anthropic down/)
    expect(m(generateBriefing)).not.toHaveBeenCalled()
    expect(m(finishRun).mock.calls[0][2].status).toBe('failed')
  })

  it('ADR-028: no new founder input + assets exist → regeneration SKIPPED, no-change briefing still published', async () => {
    m(collectCycleDelta).mockResolvedValue({ digest: undefined, hasNewInput: false })
    const result = await runCycle(admin, { founderId: 'f1' })
    // No LLM asset spend; the honest 'skipped' status; the briefing still runs (which, with
    // zero new versions for this execution, is the reachable no-change path).
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
    expect(result.stages.P001.assets).toBe('skipped')
    expect(m(generateBriefing)).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('completed')
  })

  it('ADR-028: first cycle (assets missing) regenerates even with no new input', async () => {
    m(collectCycleDelta).mockResolvedValue({ digest: undefined, hasNewInput: false })
    m(getCurrentAsset).mockResolvedValue(null) // nothing exists yet
    await runCycle(admin, { founderId: 'f1' })
    expect(m(generateAssetContent)).toHaveBeenCalledTimes(P001_ASSETS)
  })

  it('later assets in a cycle SEE the ones just written (each step re-reads the DB)', async () => {
    // Run 4: AS004 contradicted AS001 by 10x on the ICP's procurement spend, because every
    // asset got the same frozen pre-loop snapshot. Chunking replaced the in-memory snapshot
    // with a fresh DB read every step — this fake simulates that persistence (a real
    // getCurrentAsset call would see it too, since generateAssetContent really does persist).
    m(collectCycleDelta).mockResolvedValue({ digest: undefined, hasNewInput: false })
    const persisted = new Map<string, string>()
    m(getCurrentAsset).mockImplementation(async (_a: unknown, _f: unknown, assetId: string) =>
      persisted.has(assetId) ? { content: persisted.get(assetId) } : null,
    )
    m(generateAssetContent).mockImplementation(async (_a, callArgs) => {
      const content = `GENERATED ${callArgs.assetId}`
      persisted.set(callArgs.assetId, content)
      return { id: `v-${callArgs.assetId}`, content }
    })
    await runCycle(admin, { founderId: 'f1' })

    const calls = m(generateAssetContent).mock.calls
    expect(calls.length).toBe(P001_ASSETS)
    const firstAssetId = calls[0][1].assetId
    // Every LATER call's context must include the first asset's freshly-generated content.
    // (The map is shared by reference — that sharing IS the visibility mechanism, which also
    // means call 0's retained args show the final state; only the later-call check is valid.)
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i][1].context.currentAssets[firstAssetId]).toBe(`GENERATED ${firstAssetId}`)
    }
  })

  it('ADR-028: the delta digest is fed to judgement as New Information, windowed on the last completed run', async () => {
    m(getLastCompletedRun).mockResolvedValue({ id: 'prev', startedAt: '2026-07-13T09:00:00Z' })
    await runCycle(admin, { founderId: 'f1' })
    expect(m(collectCycleDelta)).toHaveBeenCalledWith(admin, 'f1', '2026-07-13T09:00:00Z')
    const judgeContext = m(generateAssetContent).mock.calls[0][1].context
    expect(judgeContext.newInformation).toBe('- founder edited AS001')
  })

  it('a failed briefing stage reads FAILED while its completed assets stay completed', async () => {
    // B4's second failure path: assets succeed, the briefing throws.
    m(generateBriefing).mockRejectedValue(new Error('briefing exploded'))
    const result = await runCycle(admin, { founderId: 'f1' })
    expect(result.status).toBe('failed')
    expect(result.stages.P001.assets).toBe('completed')
    expect(result.stages.P001.briefing).toBe('failed') // not 'pending', not 'blocked'
    expect(result.stages.P001.error).toMatch(/briefing exploded/)
  })
})

describe('F10 runNextStep — chunking granularity (each call is ~one Claude call)', () => {
  it('advances by exactly ONE asset per call, done:false until the run is finished', async () => {
    for (let i = 0; i < P001_ASSETS; i++) {
      const step = await runNextStep(admin, runStore.id)
      expect(step.done).toBe(false)
      expect(m(generateAssetContent)).toHaveBeenCalledTimes(i + 1)
      expect(m(generateBriefing)).not.toHaveBeenCalled() // the briefing waits for every asset
    }

    const briefingStep = await runNextStep(admin, runStore.id)
    expect(briefingStep.done).toBe(false)
    expect(m(generateBriefing)).toHaveBeenCalledTimes(1)
    expect(runStore.status).toBe('running') // not finished yet — finishRun hasn't run

    const finalStep = await runNextStep(admin, runStore.id)
    expect(finalStep.done).toBe(true)
    expect(runStore.status).toBe('completed')
  })

  it('calling it again on an already-terminal run is a safe no-op', async () => {
    runStore.status = 'completed'
    const step = await runNextStep(admin, runStore.id)
    expect(step.done).toBe(true)
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
  })
})

describe('F10 runNextStep — a duplicate step losing the DB write race is progress, not a failure', () => {
  it('an asset persistence conflict (23505) is treated as decided, not failed', async () => {
    // The unique index on asset_versions(asset_id, execution_id) is what actually prevents a
    // double-write; this asserts the ENGINE reacts to it correctly rather than poisoning the
    // program's stage the way a real generation failure would.
    m(generateAssetContent).mockRejectedValue(new AssetPersistenceError('conflict', 'already persisted'))
    const step = await runNextStep(admin, runStore.id)
    expect(step.done).toBe(false)
    const stage = runStore.stages.P001 as { assets: string; assetsDone: string[] }
    expect(stage.assets).toBe('pending') // more assets may remain — not flipped to 'failed'
    expect(stage.assetsDone.length).toBe(1) // the conflicting one still counts as decided
  })

  it('a briefing publish conflict (23505) is treated as completed, not failed', async () => {
    for (let i = 0; i < P001_ASSETS; i++) await runNextStep(admin, runStore.id) // walk to the briefing step
    m(generateBriefing).mockRejectedValue(new BriefingError('duplicate', 'already published'))
    const step = await runNextStep(admin, runStore.id)
    expect(step.done).toBe(false)
    expect((runStore.stages.P001 as { briefing: string }).briefing).toBe('completed')
  })
})

describe('F10 migration — run table + deferred FKs', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20260715000009_operating_rhythm_runs.sql'),
    'utf8',
  )
  const executable = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('idempotency key is unique (founder_id, cycle_key)', () => {
    expect(executable).toMatch(/unique\s*\(founder_id,\s*cycle_key\)/i)
  })

  it('is read-only for authenticated (one SELECT-own policy, no writes)', () => {
    const kinds = (executable.match(/create\s+policy\s+"[^"]+"\s+on\s+operating_rhythm_runs\s+for\s+(\w+)/gi) ?? [])
      .map(x => x.match(/for\s+(\w+)/i)![1].toLowerCase())
    expect(kinds).toEqual(['select'])
  })

  it('lands the deferred execution_id FKs on assets and briefings', () => {
    expect(executable).toMatch(/asset_versions[\s\S]*?foreign key\s*\(execution_id\)\s*references\s+operating_rhythm_runs\(id\)/i)
    expect(executable).toMatch(/executive_briefings[\s\S]*?foreign key\s*\(execution_id\)\s*references\s+operating_rhythm_runs\(id\)/i)
  })
})
