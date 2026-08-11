import { isActivating } from '@/features/executive/lib/useActivationCheck'

const RUNNING = (startedAt: string) => ({ runId: 'r1', status: 'running' as const, startedAt })
const COMPLETED = (startedAt: string) => ({ runId: 'r1', status: 'completed' as const, startedAt })

describe('isActivating', () => {
  it('true — a running run that started at or after the mandate was confirmed', () => {
    expect(isActivating(RUNNING('2026-08-11T10:00:00Z'), '2026-08-11T09:59:00Z')).toBe(true)
    expect(isActivating(RUNNING('2026-08-11T10:00:00Z'), '2026-08-11T10:00:00Z')).toBe(true) // equal counts
  })

  it('false — no run at all', () => {
    expect(isActivating(null, '2026-08-11T09:59:00Z')).toBe(false)
  })

  it('false — no confirmed mandate yet', () => {
    expect(isActivating(RUNNING('2026-08-11T10:00:00Z'), null)).toBe(false)
  })

  it('false — the run already finished (not "running")', () => {
    expect(isActivating(COMPLETED('2026-08-11T10:00:00Z'), '2026-08-11T09:59:00Z')).toBe(false)
  })

  it('false — a run from a PREVIOUS mandate still finishing (started before this confirm)', () => {
    // The exact case the docstring calls out: the weekly cron overlaps a brand-new confirm.
    expect(isActivating(RUNNING('2026-08-11T08:00:00Z'), '2026-08-11T09:59:00Z')).toBe(false)
  })
})
