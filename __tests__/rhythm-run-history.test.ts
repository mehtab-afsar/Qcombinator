/**
 * F09 artifact organization, Stage 5 — listRuns(), the founder's past-cycles read, and the
 * route wiring that surfaces it. Mocks the Supabase query builder chain the same way
 * __tests__/action-log-all.test.ts does for latestPerActionForFounder — no live Supabase in
 * this test env, so behavior is proven against a mock chain rather than a hand-rolled DB.
 */

import { readFileSync } from 'fs'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'run-1', founder_id: 'f1', contract_id: 'c1', cycle_key: '2026-W32',
  status: 'completed', stages: {}, started_at: '2026-08-04T16:23:58Z',
  completed_at: '2026-08-04T16:33:45Z', last_step_at: '2026-08-04T16:33:45Z',
  step_count: 6, failure_reason: null, ...over,
})

interface QueryBuilder {
  select: (...args: unknown[]) => QueryBuilder
  eq: (...args: unknown[]) => QueryBuilder
  order: (...args: unknown[]) => QueryBuilder
  limit: (...args: unknown[]) => Promise<{ data: unknown[]; error: { message: string } | null }>
}

function mockClient(rows: unknown[], error: { message: string } | null = null) {
  const builder = {} as QueryBuilder
  builder.select = jest.fn(() => builder)
  builder.eq = jest.fn(() => builder)
  builder.order = jest.fn(() => builder)
  builder.limit = jest.fn(() => Promise.resolve({ data: rows, error }))
  return { from: jest.fn(() => builder), _builder: builder }
}

import { listRuns, RunError } from '@/lib/rhythm/runs'

describe('listRuns', () => {
  it('scopes by founder_id, orders newest-first, and defaults to a limit of 10', async () => {
    const client = mockClient([row()])
    await listRuns(client as never, 'f1')
    expect(client._builder.eq).toHaveBeenCalledWith('founder_id', 'f1')
    expect(client._builder.order).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(client._builder.limit).toHaveBeenCalledWith(10)
  })

  it('honors a caller-supplied limit', async () => {
    const client = mockClient([row()])
    await listRuns(client as never, 'f1', 3)
    expect(client._builder.limit).toHaveBeenCalledWith(3)
  })

  it('returns EVERY status, not just completed — an honest history includes failed/stalled runs', async () => {
    const rows = [row({ id: 'a', status: 'completed' }), row({ id: 'b', status: 'failed' })]
    const runs = await listRuns(mockClient(rows) as never, 'f1')
    expect(runs.map(r => r.status)).toEqual(['completed', 'failed'])
  })

  it('maps snake_case DB columns to the camelCase RhythmRun shape', async () => {
    const [run] = await listRuns(mockClient([row()]) as never, 'f1')
    expect(run).toMatchObject({
      id: 'run-1', founderId: 'f1', cycleKey: '2026-W32', status: 'completed', stepCount: 6,
    })
  })

  it('propagates a read failure rather than swallowing it', async () => {
    const client = mockClient([], { message: 'connection reset' })
    await expect(listRuns(client as never, 'f1')).rejects.toThrow(RunError)
  })
})

describe('GET /api/rhythm/run — history wiring', () => {
  const route = readFileSync('app/api/rhythm/run/route.ts', 'utf8')

  it('reads run history via listRuns and returns it alongside progress', () => {
    expect(route).toContain('listRuns(supabase, auth.user.id)')
    expect(route).toContain('const progress = buildProgress(run, activePrograms)')
    expect(route).toContain('NextResponse.json({ progress, history })')
  })

  it('returns an empty history rather than an error when nothing has ever run', () => {
    expect(route).toContain("progress: null, history: []")
  })
})
