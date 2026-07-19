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
  return { ...actual, createRun: jest.fn(), finishRun: jest.fn(), getLastCompletedRun: jest.fn() }
})

import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { runCycle, RhythmError } from '@/lib/rhythm/run'
import { createRun, finishRun, getLastCompletedRun, CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { generateAssetContent } from '@/lib/rhythm/judge'
import { collectCycleDelta } from '@/lib/rhythm/delta'
import { generateBriefing } from '@/lib/briefings/generate'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getCurrentStrategy } from '@/lib/mandate/strategy'
import { getCurrentAsset } from '@/lib/assets/versioning'
import { getProgram } from '@/lib/registry'

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

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentContract).mockResolvedValue(contract())
  m(getCurrentStrategy).mockResolvedValue({ mission: 'M', priorities: ['p'], goals: [] })
  m(getProgramsForContract).mockResolvedValue([activeP001])
  m(getCurrentAsset).mockResolvedValue({ content: 'prior version' })
  m(createRun).mockResolvedValue({ id: 'run1', cycleKey: '2026-W29' })
  m(getLastCompletedRun).mockResolvedValue(null)
  // Default: the founder DID something this week, so regeneration proceeds (ADR-028).
  m(collectCycleDelta).mockResolvedValue({ digest: '- founder edited AS001', hasNewInput: true })
  m(generateAssetContent).mockResolvedValue({ id: 'v1' })
  m(generateBriefing).mockResolvedValue({ id: 'b1' })
  m(finishRun).mockResolvedValue(undefined)
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
    m(createRun).mockRejectedValue(new CycleAlreadyRanError('2026-W29'))
    await expect(runCycle(admin, { founderId: 'f1' })).rejects.toBeInstanceOf(CycleAlreadyRanError)
    expect(m(generateAssetContent)).not.toHaveBeenCalled()
  })

  it('refuses to run without a confirmed mandate (never creates a run)', async () => {
    m(getCurrentContract).mockResolvedValue(contract({ status: 'draft' }))
    await expect(runCycle(admin, { founderId: 'f1' })).rejects.toBeInstanceOf(RhythmError)
    expect(m(createRun)).not.toHaveBeenCalled()
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
