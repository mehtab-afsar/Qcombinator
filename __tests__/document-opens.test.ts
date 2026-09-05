/**
 * Feature A — document/briefing open tracking: aggregateDocumentOpens' pure follow-up logic
 * (the admin dashboard's real "did this land" signal), plus the migration's append-only and
 * zero-permissive-policy shape. DB-free, matching __tests__/admin-metrics-aggregation.test.ts
 * and __tests__/briefings.test.ts's own style.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { aggregateDocumentOpens } from '@/app/api/admin/metrics/route'

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000

describe('aggregateDocumentOpens', () => {
  it('counts totals, buckets by type, and counts distinct founders', () => {
    const opens = [
      { document_type: 'asset_version' as const, document_id: 'd1', founder_id: 'f1', asset_id: 'AS001', program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' },
      { document_type: 'asset_version' as const, document_id: 'd2', founder_id: 'f1', asset_id: 'AS002', program_id: 'p1', opened_at: '2026-08-02T00:00:00Z' },
      { document_type: 'briefing' as const, document_id: 'd3', founder_id: 'f2', asset_id: null, program_id: 'p2', opened_at: '2026-08-03T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, [], [], WINDOW_MS)
    expect(result.total).toBe(3)
    expect(result.byType).toEqual({ asset_version: 2, briefing: 1 })
    expect(result.distinctFounders).toBe(2)
  })

  it('an asset open followed by the founder editing that asset within the window counts as followed-up', () => {
    const opens = [{ document_type: 'asset_version' as const, document_id: 'd1', founder_id: 'f1', asset_id: 'AS001', program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpAssetVersions = [
      { founder_id: 'f1', asset_id: 'AS001', authored_by: 'founder', update_reason: null, created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, followUpAssetVersions, [], WINDOW_MS)
    expect(result.followedByAction).toBe(1)
    expect(result.followUpRate).toBe(100)
  })

  it('an asset open followed by a "Direct the AI" rework counts as followed-up too', () => {
    const opens = [{ document_type: 'asset_version' as const, document_id: 'd1', founder_id: 'f1', asset_id: 'AS001', program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpAssetVersions = [
      { founder_id: 'f1', asset_id: 'AS001', authored_by: 'program', update_reason: 'Directed: sharpen the ICP', created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, followUpAssetVersions, [], WINDOW_MS)
    expect(result.followedByAction).toBe(1)
  })

  it('an asset open followed by an ordinary program-authored write (a normal cycle, not a rework) does not count', () => {
    const opens = [{ document_type: 'asset_version' as const, document_id: 'd1', founder_id: 'f1', asset_id: 'AS001', program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpAssetVersions = [
      { founder_id: 'f1', asset_id: 'AS001', authored_by: 'program', update_reason: null, created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, followUpAssetVersions, [], WINDOW_MS)
    expect(result.followedByAction).toBe(0)
  })

  it('a follow-up outside the window does not count', () => {
    const opens = [{ document_type: 'asset_version' as const, document_id: 'd1', founder_id: 'f1', asset_id: 'AS001', program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpAssetVersions = [
      { founder_id: 'f1', asset_id: 'AS001', authored_by: 'founder', update_reason: null, created_at: '2026-08-20T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, followUpAssetVersions, [], WINDOW_MS)
    expect(result.followedByAction).toBe(0)
  })

  it('a briefing open followed by an approved/declined Action on the same program within the window counts as followed-up', () => {
    const opens = [{ document_type: 'briefing' as const, document_id: 'd1', founder_id: 'f1', asset_id: null, program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpActionLog = [
      { founder_id: 'f1', program_id: 'p1', status: 'approved', created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, [], followUpActionLog, WINDOW_MS)
    expect(result.followedByAction).toBe(1)
  })

  it('a briefing open followed by an Action on a DIFFERENT program does not count', () => {
    const opens = [{ document_type: 'briefing' as const, document_id: 'd1', founder_id: 'f1', asset_id: null, program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpActionLog = [
      { founder_id: 'f1', program_id: 'p2', status: 'approved', created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, [], followUpActionLog, WINDOW_MS)
    expect(result.followedByAction).toBe(0)
  })

  it('a pending_approval Action does not count as a follow-up — only a real decision does', () => {
    const opens = [{ document_type: 'briefing' as const, document_id: 'd1', founder_id: 'f1', asset_id: null, program_id: 'p1', opened_at: '2026-08-01T00:00:00Z' }]
    const followUpActionLog = [
      { founder_id: 'f1', program_id: 'p1', status: 'pending_approval', created_at: '2026-08-02T00:00:00Z' },
    ]
    const result = aggregateDocumentOpens(opens, [], followUpActionLog, WINDOW_MS)
    expect(result.followedByAction).toBe(0)
  })

  it('an empty window is a real, honest zero — no division by zero', () => {
    expect(aggregateDocumentOpens([], [], [], WINDOW_MS)).toEqual({
      total: 0, byType: {}, distinctFounders: 0, followedByAction: 0, followUpRate: 0,
    })
  })
})

describe('document_open_events migration — append-only + zero permissive policies', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20260903000001_document_open_events.sql'),
    'utf8',
  )
  const executable = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('creates NO policy at all — service-role only, same shape as qscore_lite_lookups', () => {
    expect(executable).not.toMatch(/create\s+policy/i)
  })

  it('installs an append-only trigger on UPDATE and DELETE', () => {
    expect(executable).toMatch(/create\s+trigger\s+document_open_events_no_mutation[\s\S]*?before\s+update\s+or\s+delete\s+on\s+document_open_events/i)
  })

  it('carves out cascaded deletes (depth > 1) from day one, unlike the first executive_briefings migration', () => {
    expect(executable).toMatch(/pg_trigger_depth\(\)\s*>\s*1/)
  })

  it('constrains document_type to the two known kinds', () => {
    expect(executable).toMatch(/document_type\s+text\s+not\s+null\s+check\s*\(\s*document_type\s+in\s*\(\s*'asset_version',\s*'briefing'\s*\)\s*\)/i)
  })

  it('enables RLS', () => {
    expect(executable).toMatch(/alter\s+table\s+document_open_events\s+enable\s+row\s+level\s+security/i)
  })
})

describe('⚠️ a null program correlates with nothing', () => {
  // Both executive_briefings.program_id and action_log.program_id are nullable, and `null ===
  // null` is true. Without an explicit guard a briefing with no program counts as followed-up by
  // any approved Action that also had no program — inflating the one number in this whole route
  // that a retention decision would rest on.
  const openWithNoProgram = {
    document_type: 'briefing' as const, document_id: 'd1', founder_id: 'f1',
    asset_id: null, program_id: null, opened_at: '2026-08-01T00:00:00Z',
  }

  it('does not match an action that also has no program', () => {
    const result = aggregateDocumentOpens([openWithNoProgram], [], [
      { founder_id: 'f1', program_id: null, status: 'approved', created_at: '2026-08-02T00:00:00Z' },
    ], WINDOW_MS)

    expect(result.followedByAction).toBe(0)
    expect(result.followUpRate).toBe(0)
  })

  it('still counts the open itself — it is unfollowed, not invisible', () => {
    const result = aggregateDocumentOpens([openWithNoProgram], [], [], WINDOW_MS)
    expect(result.total).toBe(1)
    expect(result.byType.briefing).toBe(1)
  })

  it('a real program still correlates normally', () => {
    // Guards the guard: the fix must not turn every briefing correlation off.
    const result = aggregateDocumentOpens([{ ...openWithNoProgram, program_id: 'p1' }], [], [
      { founder_id: 'f1', program_id: 'p1', status: 'approved', created_at: '2026-08-02T00:00:00Z' },
    ], WINDOW_MS)

    expect(result.followedByAction).toBe(1)
  })
})
