/**
 * F07 — the Strategy Session.
 *
 * Covers the versioning contract (F07's DoD: "persists, versions, feeds F08"),
 * the completeness gate, and the feature flag — which until now had zero
 * consumers, so this is the first time it is proven in BOTH states.
 *
 * The DB-level guarantees (the partial unique index, RLS) are asserted against
 * the migration itself: they cannot be exercised without a live Postgres, and
 * asserting them in a mock would prove only that the mock agrees with me.
 */

import { readFileSync } from 'fs'
import {
  getCurrentStrategy,
  getStrategyHistory,
  isStrategyComplete,
  saveStrategy,
  StrategyWriteError,
  type StrategySession,
} from '@/lib/mandate/strategy'

jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

// ─── A fake strategy_sessions table ───────────────────────────────────────────

interface Row {
  id: string; founder_id: string; version: number; is_current: boolean
  mission: string | null; priorities: unknown; goals: unknown
  previous_version_id: string | null; created_at: string
}

let rows: Row[]
let insertError: { code?: string; message: string } | null

function fakeSupabase() {
  return {
    from: () => {
      const filters: Record<string, unknown> = {}
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (col: string, val: unknown) => { filters[col] = val; return q },
        order: () => {
          const found = rows
            .filter(r => r.founder_id === filters.founder_id)
            .sort((a, b) => b.version - a.version)
          return Promise.resolve({ data: found, error: null })
        },
        maybeSingle: () => {
          const found = rows.find(r =>
            Object.entries(filters).every(([k, v]) => r[k as keyof Row] === v))
          return Promise.resolve({ data: found ?? null, error: null })
        },
        single: () => Promise.resolve({ data: rows[rows.length - 1], error: null }),
        insert: (payload: Partial<Row>) => {
          if (insertError) return { select: () => ({ single: () => Promise.resolve({ data: null, error: insertError }) }) }
          const row: Row = {
            id: `s${rows.length + 1}`,
            created_at: new Date(2026, 6, 15 + rows.length).toISOString(),
            ...payload,
          } as Row
          rows.push(row)
          return { select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }
        },
        update: (payload: Partial<Row>) => {
          const chain: Record<string, unknown> = {
            eq: (col: string, val: unknown) => { filters[col] = val; return chain },
            then: (resolve: (v: unknown) => unknown) => {
              for (const r of rows) {
                if (Object.entries(filters).every(([k, v]) => r[k as keyof Row] === v)) {
                  Object.assign(r, payload)
                }
              }
              return Promise.resolve({ error: null }).then(resolve)
            },
          }
          return chain
        },
      }
      return q
    },
  } as never
}

beforeEach(() => {
  rows = []
  insertError = null
})

const FOUNDER = 'founder-1'

// ─── Versioning (F07's DoD) ───────────────────────────────────────────────────

describe('versioning — nothing is ever overwritten', () => {
  it('the first save is version 1 and is current', async () => {
    const s = await saveStrategy(fakeSupabase(), FOUNDER, {
      mission: 'Cut procurement overhead.',
      priorities: ['Win 10 design partners'],
    })
    expect(s.version).toBe(1)
    expect(s.isCurrent).toBe(true)
    expect(s.previousVersionId).toBeNull()
  })

  it('a revision creates v2 and RETIRES v1 — v1 still exists', async () => {
    const db = fakeSupabase()
    const v1 = await saveStrategy(db, FOUNDER, { mission: 'First take.' })
    const v2 = await saveStrategy(db, FOUNDER, { mission: 'Sharper take.' })

    expect(v2.version).toBe(2)
    expect(v2.isCurrent).toBe(true)
    expect(v2.previousVersionId).toBe(v1.id)

    // The whole point: history is retained, not replaced.
    const old = rows.find(r => r.id === v1.id)!
    expect(old.is_current).toBe(false)
    expect(old.mission).toBe('First take.')
    expect(rows).toHaveLength(2)
  })

  it('exactly one row is current after several revisions', async () => {
    const db = fakeSupabase()
    for (const m of ['a', 'b', 'c', 'd']) await saveStrategy(db, FOUNDER, { mission: m })

    expect(rows.filter(r => r.is_current)).toHaveLength(1)
    expect(rows.filter(r => r.is_current)[0].mission).toBe('d')
    expect(rows.map(r => r.version)).toEqual([1, 2, 3, 4])
  })

  it('history reads newest first and keeps every version', async () => {
    const db = fakeSupabase()
    await saveStrategy(db, FOUNDER, { mission: 'v1' })
    await saveStrategy(db, FOUNDER, { mission: 'v2' })

    const history = await getStrategyHistory(db, FOUNDER)
    expect(history.map(h => h.version)).toEqual([2, 1])
  })

  it('getCurrentStrategy returns null before anything is saved', async () => {
    expect(await getCurrentStrategy(fakeSupabase(), FOUNDER)).toBeNull()
  })
})

// ─── Losing a race must be visible ────────────────────────────────────────────

describe('a concurrent save that loses the race', () => {
  it('surfaces a clear error rather than silently dropping the edit', async () => {
    // 23505 = the partial unique index rejecting a second is_current row. The
    // founder must learn their edit did not stick — swallowing this would lose
    // their work while looking like success.
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint' }

    await expect(saveStrategy(fakeSupabase(), FOUNDER, { mission: 'x' }))
      .rejects.toThrow(/Another save completed first/)
    await expect(saveStrategy(fakeSupabase(), FOUNDER, { mission: 'x' }))
      .rejects.toThrow(StrategyWriteError)
  })

  it('surfaces other write failures too — never a silent success', async () => {
    insertError = { message: 'connection reset' }
    await expect(saveStrategy(fakeSupabase(), FOUNDER, { mission: 'x' }))
      .rejects.toThrow(/Failed to save strategy/)
  })
})

// ─── Partial drafts save; F08 is where completeness bites ─────────────────────

describe('completeness gate (F07 edge case)', () => {
  it('saves a partial draft happily — resumable', async () => {
    const s = await saveStrategy(fakeSupabase(), FOUNDER, { mission: 'Half a thought' })
    expect(s.version).toBe(1)
    expect(s.priorities).toEqual([])
  })

  const complete = (over: Partial<StrategySession> = {}): StrategySession => ({
    id: 's1', founderId: FOUNDER, version: 1, isCurrent: true,
    mission: 'Cut procurement overhead.', priorities: ['Win design partners'],
    goals: [], previousVersionId: null, createdAt: '', ...over,
  })

  it.each([
    ['null strategy', null, false],
    ['complete', complete(), true],
    ['no mission', complete({ mission: null }), false],
    ['blank mission', complete({ mission: '   ' }), false],
    ['no priorities', complete({ priorities: [] }), false],
    ['goals are optional', complete({ goals: [] }), true],
  ])('%s -> %s', (_label, strategy, expected) => {
    expect(isStrategyComplete(strategy)).toBe(expected)
  })
})

// ─── The guarantees that live in the database ─────────────────────────────────

describe('the migration carries the guarantees application code cannot', () => {
  const sql = readFileSync('supabase/migrations/20260715000001_strategy_sessions.sql', 'utf8')

  /**
   * Executable SQL only.
   *
   * The migration deliberately QUOTES the broken `using (true)` policy in a
   * comment, to show the next person the exact pattern not to copy. Without this,
   * the anti-pattern check below matches that comment and fails — the test would
   * be reading documentation, not SQL.
   *
   * (The score-invariant guard makes the opposite call and scans prose too. That
   * one defends a locked decision, where blunt-and-unbypassable beats accurate.
   * This one inspects a file's actual statements, where accuracy is the job.)
   */
  const executableSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')

  it('enforces one-current with a partial unique index, not with hope', () => {
    // "Exactly one current version" is unachievable in application code: two
    // concurrent requests can both read "no current" and both insert. Only the
    // database can make it impossible.
    expect(sql).toMatch(/create unique index[\s\S]*strategy_sessions_one_current_per_founder[\s\S]*where is_current/i)
  })

  it('makes version numbers unique per founder', () => {
    expect(sql).toMatch(/create unique index[\s\S]*strategy_sessions_founder_version[\s\S]*\(founder_id, version\)/i)
  })

  it('enables RLS and scopes every policy to the owner', () => {
    expect(sql).toMatch(/alter table strategy_sessions enable row level security/i)
    expect(sql).toContain('using (auth.uid() = founder_id)')
    expect(sql).toContain('with check (auth.uid() = founder_id)')
  })

  it('does NOT carry the permissive policy that breaks 4 existing tables', () => {
    // scheduled_actions, agent_goals, delegation_tasks and
    // founder_metric_snapshots each pair a founder-scoped policy with
    // `for all using (true)` and no TO clause — which applies to PUBLIC and, since
    // permissive policies are OR'd, overrides the scoped one entirely.
    // See PHASE0_AUDIT.md §8d. This table must never grow one.
    const policies = executableSql.match(/create policy[\s\S]*?;/gi) ?? []
    for (const p of policies) {
      expect(p).not.toMatch(/using\s*\(\s*true\s*\)/i)
    }
    expect(policies).toHaveLength(3) // select, insert, retire — no escape hatch
  })

  it('has no DELETE policy — history is append-only (CLAUDE.md §4)', () => {
    expect(executableSql).not.toMatch(/create policy[^;]*for delete/i)
  })

  it('ships a rollback (CLAUDE.md §4)', () => {
    expect(sql).toMatch(/drop table\s+if exists strategy_sessions/i)
  })
})

// ─── The feature flag finally has a consumer ──────────────────────────────────

describe('the route is gated by NEW_EXECUTIVE_MODEL', () => {
  const routeSrc = readFileSync('app/api/strategy/route.ts', 'utf8')

  it('reads the flag', () => {
    // The first consumer since Phase 0 added it. Until now it was inert.
    expect(routeSrc).toContain('FF_NEW_EXECUTIVE_MODEL')
  })

  it('404s when off — invisible, not merely forbidden', () => {
    expect(routeSrc).toMatch(/if \(FF_NEW_EXECUTIVE_MODEL\) return null/)
    expect(routeSrc).toMatch(/status: 404/)
  })

  it('gates BOTH verbs — a flag on one method is not a flag', () => {
    const get = routeSrc.slice(routeSrc.indexOf('export async function GET'), routeSrc.indexOf('export async function POST'))
    const post = routeSrc.slice(routeSrc.indexOf('export async function POST'))
    expect(get).toContain('flagOff()')
    expect(post).toContain('flagOff()')
  })

  it('validates input with Zod and authenticates before touching data', () => {
    expect(routeSrc).toContain('parseBody(req, strategySchema)')
    expect(routeSrc).toContain('verifyAuth()')
    // The user-scoped client, so RLS enforces tenancy rather than this route
    // remembering to. createAdminClient would bypass the guarantee.
    expect(routeSrc).toContain('await createClient()')
    expect(routeSrc).not.toContain('createAdminClient')
  })
})
