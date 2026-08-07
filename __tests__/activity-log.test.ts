/**
 * lib/activity/log.ts — CANVAS_SPEC §4.5's Activity Log: a read over asset_versions,
 * action_log and executive_briefings, merged into one reverse-chron feed per executive.
 */

import { getActivityForExecutive, dedupeActionAttempts } from '@/lib/activity/log'
import type { ActionLogEntry } from '@/lib/actions/log'

function entry(overrides: Partial<ActionLogEntry>): ActionLogEntry {
  return {
    id: 'row1', founderId: 'f1', programId: 'prog1', executionId: 'run1', actionId: 'interview_customers',
    provider: null, irreversible: true, status: 'pending_approval', payloadHash: null,
    request: {}, result: null, approvedBy: null, approvedAt: null, createdAt: '2026-07-21T12:00:00Z',
    ...overrides,
  }
}

describe('dedupeActionAttempts', () => {
  it('collapses a status-change sequence within the SAME execution to its latest row', () => {
    const rows = [
      entry({ id: 'r3', status: 'executed', createdAt: '2026-07-21T12:02:00Z' }),
      entry({ id: 'r2', status: 'approved', createdAt: '2026-07-21T12:01:00Z' }),
      entry({ id: 'r1', status: 'pending_approval', createdAt: '2026-07-21T12:00:00Z' }),
    ]
    const result = dedupeActionAttempts(rows) // caller passes newest-first, as the DB query does
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r3')
    expect(result[0].status).toBe('executed')
  })

  it('keeps separate attempts from DIFFERENT executions — the same Action run again in a later cycle', () => {
    const rows = [
      entry({ id: 'r2', executionId: 'run2', status: 'executed', createdAt: '2026-07-28T12:00:00Z' }),
      entry({ id: 'r1', executionId: 'run1', status: 'executed', createdAt: '2026-07-21T12:00:00Z' }),
    ]
    expect(dedupeActionAttempts(rows)).toHaveLength(2)
  })
})

function fakeSupabase(byTable: Record<string, unknown[]>) {
  const builder = () => {
    let rows: unknown[] = []
    const chain: PromiseLike<{ data: unknown[]; error: null }> & Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (onfulfilled) => Promise.resolve({ data: rows, error: null }).then(onfulfilled),
    }
    return { chain, setRows: (r: unknown[]) => { rows = r } }
  }
  const builders = new Map<string, ReturnType<typeof builder>>()
  for (const [table, rows] of Object.entries(byTable)) {
    const b = builder()
    b.setRows(rows)
    builders.set(table, b)
  }
  return {
    from: (table: string) => (builders.get(table) ?? builder()).chain,
  } as unknown as import('@supabase/supabase-js').SupabaseClient
}

const programs = [{ id: 'prog1', templateId: 'P001' as const, owner: 'growth' }]

/** action_log rows as the DB actually returns them (snake_case) — distinct from `entry()`
 *  above, which builds the already-camelCased `ActionLogEntry` the pure dedupe fn consumes. */
function actionRow(overrides: Record<string, unknown>) {
  return {
    id: 'row1', founder_id: 'f1', program_id: 'prog1', execution_id: 'run1',
    action_id: 'interview_customers', provider: null, irreversible: true, status: 'pending_approval',
    payload_hash: null, request: {}, result: null, approved_by: null, approved_at: null,
    created_at: '2026-07-21T12:00:00Z',
    ...overrides,
  }
}

describe('getActivityForExecutive', () => {
  it('merges assets, actions and briefings into one reverse-chron feed', async () => {
    const client = fakeSupabase({
      asset_versions: [{ id: 'v1', asset_id: 'AS001', version: 2, authored_by: 'program', update_reason: null, created_at: '2026-07-21T12:00:00Z' }],
      action_log: [actionRow({ created_at: '2026-07-21T13:00:00Z' })],
      executive_briefings: [{ id: 'b1', verdict: '3 partners engaged this week.', created_at: '2026-07-21T11:00:00Z' }],
    })
    const activity = await getActivityForExecutive(client, 'f1', 'growth', programs)
    expect(activity.map(a => a.kind)).toEqual(['action', 'asset', 'briefing']) // newest first
  })

  it('a founder edit reads distinctly from a program-authored version', async () => {
    const client = fakeSupabase({
      asset_versions: [{ id: 'v1', asset_id: 'AS001', version: 3, authored_by: 'founder', update_reason: 'Founder edit', created_at: '2026-07-21T12:00:00Z' }],
      action_log: [],
      executive_briefings: [],
    })
    const activity = await getActivityForExecutive(client, 'f1', 'growth', programs)
    expect(activity[0].detail).toBe('you edited this')
  })

  it('skips the action_log query entirely when this executive owns no programs (no id to filter on)', async () => {
    const client = fakeSupabase({ asset_versions: [], action_log: [], executive_briefings: [] })
    const activity = await getActivityForExecutive(client, 'f1', 'finance', [])
    expect(activity).toEqual([])
  })

  it('a briefing verdict over 140 chars is truncated with an ellipsis, never shown raw and unbounded', async () => {
    const long = 'x'.repeat(200)
    const client = fakeSupabase({
      asset_versions: [], action_log: [],
      executive_briefings: [{ id: 'b1', verdict: long, created_at: '2026-07-21T12:00:00Z' }],
    })
    const activity = await getActivityForExecutive(client, 'f1', 'growth', programs)
    expect(activity[0].detail?.endsWith('…')).toBe(true)
    expect(activity[0].detail?.length).toBeLessThanOrEqual(141)
  })
})
