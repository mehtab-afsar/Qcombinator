import { readFileSync } from 'fs'
import { join } from 'path'
import { isCycleLive, cycleSignature } from '@/features/executive/lib/useCycleLive'

describe('isCycleLive', () => {
  it('true — running and not stalled', () => {
    expect(isCycleLive({ status: 'running', stalled: false })).toBe(true)
  })

  it('false — no run at all', () => {
    expect(isCycleLive(null)).toBe(false)
  })

  it('false — completed', () => {
    expect(isCycleLive({ status: 'completed', stalled: false })).toBe(false)
  })

  it('false — failed', () => {
    expect(isCycleLive({ status: 'failed', stalled: false })).toBe(false)
  })

  it('false — FU-010: status still says "running" but the self-chain died server-side (stalled)', () => {
    expect(isCycleLive({ status: 'running', stalled: true })).toBe(false)
  })
})

// ─── The staleness bug: a panel keyed to `generation` must move DURING a run, not only at its
// ends. `cycleSignature` is what decides that; the hook just compares it against the last one.

describe('cycleSignature — what makes a consumer re-read', () => {
  it('⚠️ changes when a step lands, mid-run', () => {
    // The whole bug. `generation` used to move only when `live` flipped, so a founder watched
    // the step list tick past six finished documents while the Documents panel beside it still
    // read "Not generated yet" for three of them — for the full ~11 minutes.
    const a = cycleSignature({ status: 'running', stalled: false, done: 3 })
    const b = cycleSignature({ status: 'running', stalled: false, done: 4 })
    expect(a).not.toBe(b)
  })

  it('still changes when the cycle starts and when it ends', () => {
    const running = cycleSignature({ status: 'running', stalled: false, done: 7 })
    const finished = cycleSignature({ status: 'completed', stalled: false, done: 7 })
    expect(running).not.toBe(finished)
  })

  it('a stall counts as a change — polling stops there, so consumers must see it', () => {
    const ok = cycleSignature({ status: 'running', stalled: false, done: 2 })
    const dead = cycleSignature({ status: 'running', stalled: true, done: 2 })
    expect(ok).not.toBe(dead)
  })

  it('is stable when genuinely nothing moved — no pointless refetch every 5s', () => {
    const p = { status: 'running' as const, stalled: false, done: 3 }
    expect(cycleSignature(p)).toBe(cycleSignature({ ...p }))
  })

  it('null before anything is known, so the first poll is a baseline and not a change', () => {
    // Otherwise every consumer would fetch on mount and again immediately after.
    expect(cycleSignature(null)).toBeNull()
    expect(cycleSignature({ status: 'completed', stalled: false })).toBeNull()
  })
})

describe('nothing keeps a private, ageing copy of /api/assets any more', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  const CONSUMERS = [
    'features/executive/components/ProgramAssetsPanel.tsx',
    'features/executive/components/ProgramOverviewGrid.tsx',
    'features/executive/components/CommandView.tsx',
    'app/founder/executive/documents/page.tsx',
  ]

  it.each(CONSUMERS)('%s reads documents from the shared workspace', file => {
    const src = read(file)
    expect(src).not.toContain("fetch('/api/assets')")
    expect(src).toContain('useExecutiveWorkspace')
  })

  it('the workspace is the one place that fetches them, and it refreshes on generation', () => {
    const src = read('features/executive/hooks/useExecutiveWorkspace.tsx')
    expect(src).toContain("fetch('/api/assets')")
    // Four components each remembering to refresh is the arrangement that produced the bug.
    const refresh = src.slice(src.indexOf('const refreshAssets'))
    expect(refresh).toContain('setAssetsLoaded')
    expect(src).toMatch(/void refreshAssets\(\)[\s\S]{0,300}\[authLoading, user, generation\]/)
  })
})
