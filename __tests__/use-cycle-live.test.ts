import { isCycleLive } from '@/features/executive/lib/useCycleLive'

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
