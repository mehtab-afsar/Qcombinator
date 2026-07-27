/**
 * F10 — the founder-facing progress projection. The Command View renders whatever this says,
 * so the honesty rules live here: 'done' only after the engine persisted it, 'skipped' when
 * nothing needed doing (ADR-028), a blocked briefing is pending (it never ran) not failed, and
 * a run whose chain died reads 'stalled' rather than spinning forever (FU-004).
 */

import { buildProgress } from '@/lib/rhythm/progress'
import { STALE_AFTER_MS, type RhythmRun } from '@/lib/rhythm/runs'
import { getProgram } from '@/lib/registry'

const P001_ASSETS = getProgram('P001').assets
const TOTAL = P001_ASSETS.length + 1 // every asset, then the briefing
const NOW = Date.parse('2026-07-21T12:00:00Z')

const run = (over: Partial<RhythmRun> = {}): RhythmRun => ({
  id: 'run1',
  founderId: 'f1',
  contractId: 'c1',
  cycleKey: '2026-W30',
  status: 'running',
  stages: {},
  startedAt: '2026-07-21T11:50:00Z',
  completedAt: null,
  lastStepAt: '2026-07-21T11:59:00Z', // fresh by default
  stepCount: 0,
  failureReason: null,
  ...over,
})

const stage = (over: Record<string, unknown> = {}) => ({
  P001: { assets: 'pending', briefing: 'pending', assetsDone: [], assetsGenerated: 0, ...over },
})

describe('buildProgress — a cycle in flight', () => {
  it('a just-created run: nothing done, the first asset is active', () => {
    const p = buildProgress(run(), ['P001'], NOW)

    expect(p.total).toBe(TOTAL)
    expect(p.done).toBe(0)
    expect(p.steps[0].state).toBe('active')
    expect(p.currentLabel).toBe(p.steps[0].label)
    // Exactly one thing is ever in flight — the engine does one Claude call per step.
    expect(p.steps.filter(s => s.state === 'active')).toHaveLength(1)
    expect(p.steps.slice(1).every(s => s.state === 'pending')).toBe(true)
  })

  it('mid-run: finished assets are done, the next one is active, "2 of N"', () => {
    const done = [P001_ASSETS[0], P001_ASSETS[1]]
    const p = buildProgress(run({ stages: stage({ assetsDone: done, assetsGenerated: 2 }) }), ['P001'], NOW)

    expect(p.done).toBe(2)
    expect(p.steps[0].state).toBe('done')
    expect(p.steps[1].state).toBe('done')
    expect(p.steps[2].state).toBe('active')
    expect(p.currentLabel).toBe(p.steps[2].label)
  })

  it('steps carry the Registry name, not the raw id — this is what the founder reads', () => {
    const p = buildProgress(run(), ['P001'], NOW)
    expect(p.steps[0].label).not.toBe(P001_ASSETS[0]) // 'ICP Profiles', not 'AS001'
    expect(p.steps[0].label.length).toBeGreaterThan(4)
    expect(p.steps[p.steps.length - 1].label).toBe('Executive briefing')
  })

  it('the briefing only goes active once every asset has settled', () => {
    const mid = buildProgress(run({ stages: stage({ assetsDone: [P001_ASSETS[0]] }) }), ['P001'], NOW)
    expect(mid.steps[mid.steps.length - 1].state).toBe('pending')

    const all = buildProgress(
      run({ stages: stage({ assetsDone: [...P001_ASSETS], assetsGenerated: 5 }) }), ['P001'], NOW)
    expect(all.steps[all.steps.length - 1].state).toBe('active')
  })
})

describe('buildProgress — honest end states', () => {
  it('ADR-028 no-change week: assets read "skipped", never "done"', () => {
    const p = buildProgress(run({
      status: 'completed',
      completedAt: '2026-07-21T11:59:00Z',
      stages: stage({ assets: 'skipped', briefing: 'completed', assetsDone: [...P001_ASSETS], assetsGenerated: 0 }),
    }), ['P001'], NOW)

    expect(p.steps.filter(s => s.state === 'skipped')).toHaveLength(P001_ASSETS.length)
    expect(p.done).toBe(TOTAL) // skipped still counts as settled — the cycle is finished
    expect(p.currentLabel).toBeNull()
  })

  it('a failed asset: that step failed, the rest never started, the briefing is pending not failed', () => {
    const p = buildProgress(run({
      status: 'failed',
      stages: stage({ assets: 'failed', briefing: 'blocked', assetsDone: [P001_ASSETS[0]], error: 'anthropic down' }),
    }), ['P001'], NOW)

    expect(p.steps[0].state).toBe('done')   // what completed is kept
    expect(p.steps[1].state).toBe('failed') // the one that broke
    expect(p.steps[2].state).toBe('pending')
    // 'blocked' means it never ran — calling that 'failed' would blame a step that never started.
    expect(p.steps[p.steps.length - 1].state).toBe('pending')
    expect(p.steps.filter(s => s.state === 'failed')).toHaveLength(1)
  })

  it('a completed run has nothing active', () => {
    const p = buildProgress(run({
      status: 'completed',
      completedAt: '2026-07-21T11:59:00Z',
      stages: stage({ assets: 'completed', briefing: 'completed', assetsDone: [...P001_ASSETS], assetsGenerated: 5 }),
    }), ['P001'], NOW)

    expect(p.done).toBe(TOTAL)
    expect(p.currentLabel).toBeNull()
    expect(p.steps.some(s => s.state === 'active')).toBe(false)
  })
})

describe('buildProgress — stalled detection (FU-004)', () => {
  it('a running run with a recent step is NOT stalled', () => {
    const p = buildProgress(run({ lastStepAt: new Date(NOW - 30_000).toISOString() }), ['P001'], NOW)
    expect(p.stalled).toBe(false)
  })

  it('a running run past the staleness window IS stalled — the chain died', () => {
    const p = buildProgress(
      run({ lastStepAt: new Date(NOW - STALE_AFTER_MS - 1_000).toISOString() }), ['P001'], NOW)
    expect(p.stalled).toBe(true)
  })

  it('a finished run is never "stalled", however old', () => {
    const p = buildProgress(run({
      status: 'completed',
      lastStepAt: new Date(NOW - STALE_AFTER_MS * 10).toISOString(),
    }), ['P001'], NOW)
    expect(p.stalled).toBe(false)
  })
})

describe('buildProgress — degrades rather than throws', () => {
  it('no active programs yields an empty, honest projection', () => {
    const p = buildProgress(run(), [], NOW)
    expect(p.total).toBe(0)
    expect(p.done).toBe(0)
    expect(p.currentLabel).toBeNull()
  })

  it('an unknown Program is skipped, not thrown — it must not 500 the Command View', () => {
    // activePrograms is DATA on a confirmed contract; the Registry is code. A Registry change
    // can leave a founder holding an id that no longer resolves, and their whole page must
    // still render.
    expect(() => buildProgress(run(), ['P999'], NOW)).not.toThrow()
    expect(buildProgress(run(), ['P999'], NOW).total).toBe(0)
  })

  it('a known Program still renders alongside an unknown one', () => {
    const p = buildProgress(run(), ['P999', 'P001'], NOW)
    expect(p.total).toBe(TOTAL) // P001's steps survive P999 being unresolvable
    expect(p.steps[0].state).toBe('active')
  })
})
