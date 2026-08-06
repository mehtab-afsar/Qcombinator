/**
 * F09 Stage 5 (FU-009) — latestPerActionForFounder, the founder-wide sibling of
 * latestPerAction. Both reduce append-only action_log rows to "one entry per Action id,
 * newest wins" via a shared dedupe helper; the only real difference is query scope — one run
 * vs. every run the founder has ever had. That scope difference is exactly what this file
 * pins, since it's the one thing that could regress silently (e.g. an accidental
 * execution_id filter would make the founder-wide read behave exactly like the old one).
 */

const row = (over: Record<string, unknown> = {}) => ({
  id: 'row-1', founder_id: 'f1', program_id: 'prog-1', execution_id: 'exec-1',
  action_id: 'validate_icps', provider: null, irreversible: false, status: 'executed',
  payload_hash: null, request: {}, result: null, approved_by: null, approved_at: null,
  created_at: '2026-08-01T00:00:00Z', ...over,
})

interface QueryBuilder {
  select: (...args: unknown[]) => QueryBuilder
  eq: (...args: unknown[]) => QueryBuilder
  order: (...args: unknown[]) => Promise<{ data: unknown[]; error: { message: string } | null }>
}

function mockClient(rows: unknown[], error: { message: string } | null = null) {
  const builder = {} as QueryBuilder
  builder.select = jest.fn(() => builder)
  builder.eq = jest.fn(() => builder)
  builder.order = jest.fn(() => Promise.resolve({ data: rows, error }))
  return { from: jest.fn(() => builder), _builder: builder }
}

import { latestPerAction, latestPerActionForFounder, ActionLogError } from '@/lib/actions/log'

describe('latestPerActionForFounder', () => {
  it('scopes only by founder_id — never by execution_id (that would silently recreate the old single-run read)', async () => {
    const client = mockClient([row()])
    await latestPerActionForFounder(client as never, 'f1')
    expect(client._builder.eq).toHaveBeenCalledWith('founder_id', 'f1')
    expect(client._builder.eq).not.toHaveBeenCalledWith('execution_id', expect.anything())
  })

  it('dedupes across DIFFERENT executions — the same action recurring weekly collapses to its latest row', async () => {
    const rows = [
      row({ id: 'newest', execution_id: 'exec-2', created_at: '2026-08-08T00:00:00Z', status: 'executed' }),
      row({ id: 'older', execution_id: 'exec-1', created_at: '2026-08-01T00:00:00Z', status: 'failed' }),
    ]
    const entries = await latestPerActionForFounder(mockClient(rows) as never, 'f1')
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('newest')
    expect(entries[0].status).toBe('executed')
  })

  it('keeps entries for distinct actions separate', async () => {
    const rows = [
      row({ id: 'a', action_id: 'validate_icps' }),
      row({ id: 'b', action_id: 'prioritize_channels' }),
    ]
    const entries = await latestPerActionForFounder(mockClient(rows) as never, 'f1')
    expect(entries.map(e => e.actionId).sort()).toEqual(['prioritize_channels', 'validate_icps'])
  })

  it('propagates a read failure rather than swallowing it', async () => {
    const client = mockClient([], { message: 'connection reset' })
    await expect(latestPerActionForFounder(client as never, 'f1')).rejects.toThrow(ActionLogError)
  })
})

describe('latestPerAction — still scoped to one run (unchanged contract)', () => {
  it('DOES filter by execution_id, unlike its founder-wide sibling', async () => {
    const client = mockClient([row()])
    await latestPerAction(client as never, 'f1', 'exec-1')
    expect(client._builder.eq).toHaveBeenCalledWith('founder_id', 'f1')
    expect(client._builder.eq).toHaveBeenCalledWith('execution_id', 'exec-1')
  })

  it('dedupes multiple rows for the same action within that one run', async () => {
    const rows = [
      row({ id: 'approved', status: 'approved', created_at: '2026-08-01T00:05:00Z' }),
      row({ id: 'pending', status: 'pending_approval', created_at: '2026-08-01T00:00:00Z' }),
    ]
    const entries = await latestPerAction(mockClient(rows) as never, 'f1', 'exec-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('approved')
  })
})
