/**
 * The two pure aggregation functions behind the admin dashboard's "Operating Rhythm" and
 * "Actions" cards — the first real visibility into whether the executive team's crucial loop is
 * actually running, not just whether the code exists (see the audit that found neither table was
 * queried at all before this).
 */

import { aggregateRhythmRuns, aggregateActionLog } from '@/app/api/admin/metrics/route'
import { STALE_AFTER_MS } from '@/lib/rhythm/runs'

describe('aggregateRhythmRuns', () => {
  const NOW = new Date('2026-08-19T12:00:00Z').getTime()

  it('counts totals and buckets by status', () => {
    const rows = [
      { status: 'completed', started_at: '2026-08-18T00:00:00Z', last_step_at: '2026-08-18T00:05:00Z', step_count: 4 },
      { status: 'completed', started_at: '2026-08-17T00:00:00Z', last_step_at: '2026-08-17T00:05:00Z', step_count: 6 },
      { status: 'failed', started_at: '2026-08-16T00:00:00Z', last_step_at: '2026-08-16T00:05:00Z', step_count: 2 },
    ]
    const result = aggregateRhythmRuns(rows, NOW)
    expect(result.totalRuns).toBe(3)
    expect(result.byStatus).toEqual({ completed: 2, failed: 1 })
    expect(result.avgStepCount).toBe(4) // (4+6+2)/3
  })

  it('a "running" row with recent step progress is NOT stalled', () => {
    const recentStep = new Date(NOW - 60_000).toISOString() // 1 minute ago, well under STALE_AFTER_MS
    const rows = [{ status: 'running', started_at: '2026-08-19T11:00:00Z', last_step_at: recentStep, step_count: 3 }]
    expect(aggregateRhythmRuns(rows, NOW).stalledRunning).toBe(0)
  })

  it('a "running" row with no progress past STALE_AFTER_MS IS stalled', () => {
    const staleStep = new Date(NOW - STALE_AFTER_MS - 1_000).toISOString()
    const rows = [{ status: 'running', started_at: '2026-08-19T11:00:00Z', last_step_at: staleStep, step_count: 3 }]
    expect(aggregateRhythmRuns(rows, NOW).stalledRunning).toBe(1)
  })

  it('a stale "completed" row is not counted as stalled — only "running" can stall', () => {
    const staleStep = new Date(NOW - STALE_AFTER_MS - 1_000).toISOString()
    const rows = [{ status: 'completed', started_at: '2026-08-19T11:00:00Z', last_step_at: staleStep, step_count: 5 }]
    expect(aggregateRhythmRuns(rows, NOW).stalledRunning).toBe(0)
  })

  it('reports the most recent started_at as lastRunAt', () => {
    const rows = [
      { status: 'completed', started_at: '2026-08-17T00:00:00Z', last_step_at: '2026-08-17T00:05:00Z', step_count: 1 },
      { status: 'completed', started_at: '2026-08-18T09:00:00Z', last_step_at: '2026-08-18T09:05:00Z', step_count: 1 },
    ]
    expect(aggregateRhythmRuns(rows, NOW).lastRunAt).toBe('2026-08-18T09:00:00Z')
  })

  it('an empty window is a real, honest zero — no division by zero', () => {
    const result = aggregateRhythmRuns([], NOW)
    expect(result).toEqual({ totalRuns: 0, byStatus: {}, stalledRunning: 0, avgStepCount: 0, lastRunAt: null })
  })
})

describe('aggregateActionLog', () => {
  it('counts totals and buckets by status and provider', () => {
    const rows = [
      { status: 'pending_approval', provider: 'gmail', irreversible: true },
      { status: 'executed', provider: 'gmail', irreversible: true },
      { status: 'executed', provider: null, irreversible: false },
    ]
    const result = aggregateActionLog(rows)
    expect(result.total).toBe(3)
    expect(result.byStatus).toEqual({ pending_approval: 1, executed: 2 })
    expect(result.byProvider).toEqual({ gmail: 2, internal: 1 })
    expect(result.irreversibleCount).toBe(2)
    expect(result.internalCount).toBe(1)
  })

  it('a null provider buckets as "internal", never as a literal null key', () => {
    const result = aggregateActionLog([{ status: 'executed', provider: null, irreversible: false }])
    expect(result.byProvider).toEqual({ internal: 1 })
  })

  it('an empty window is a real, honest zero', () => {
    expect(aggregateActionLog([])).toEqual({
      total: 0, byStatus: {}, byProvider: {}, irreversibleCount: 0, internalCount: 0,
    })
  })
})
