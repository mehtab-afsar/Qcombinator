/**
 * RLS — "enabled" must mean "enforced".
 *
 * Four tables shipped with RLS enabled and a policy that overrode it. Nobody
 * noticed for months, because the reassuring facts were all true: 28 migrations
 * enable RLS, 142 policies exist. Counting policies proved nothing.
 *
 * This test reads what the policies actually SAY. It is a repo-wide guard, not a
 * check on the four tables that were broken — the point is that the fifth one
 * cannot happen quietly.
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const MIGRATIONS = join(__dirname, '..', 'supabase', 'migrations')

/** Executable SQL only — the fix migration quotes the bug in its comments. */
function executable(sql: string): string {
  return sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
}

interface Policy {
  file: string
  statement: string
  table: string
  name: string
}

const migrationFiles = (): string[] =>
  readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()

/**
 * The policies that EXIST once every migration has run.
 *
 * Migrations are a sequence, not a snapshot: the file that created a bad policy
 * keeps its `create policy` line forever, and the fix is a `drop policy` in a
 * LATER file. A scan that ignores drops reports every historical mistake as a
 * live one — which is what the first version of this test did.
 *
 * So: replay them in filename order (they are timestamp-prefixed) and keep the
 * final state.
 */
function livePolicies(): Policy[] {
  const live = new Map<string, Policy>()
  const key = (table: string, name: string) => `${table}::${name.toLowerCase()}`

  for (const file of migrationFiles()) {
    const sql = executable(readFileSync(join(MIGRATIONS, file), 'utf8'))

    // ⚠️ IN SOURCE ORDER, not grouped by kind.
    //
    // Migrations are written `drop policy if exists "x"; create policy "x" ...`
    // so they can be re-run. Processing every create and THEN every drop applies
    // that drop last and deletes the policy the file just created — reporting
    // correctly-guarded tables as having no policies at all. (It did exactly
    // that the first time.)
    const events: Array<{ at: number; kind: 'create' | 'drop'; policy: Policy | null; k: string }> = []

    for (const m of sql.matchAll(/create\s+policy\s+"([^"]+)"([\s\S]*?);/gi)) {
      const statement = m[0]
      const table = statement.match(/\bon\s+([a-z_.]+)/i)?.[1] ?? '?'
      events.push({
        at: m.index ?? 0,
        kind: 'create',
        policy: { file, statement, table, name: m[1] },
        k: key(table, m[1]),
      })
    }

    for (const m of sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+([a-z_.]+)/gi)) {
      events.push({ at: m.index ?? 0, kind: 'drop', policy: null, k: key(m[2], m[1]) })
    }

    for (const e of events.sort((a, b) => a.at - b.at)) {
      if (e.kind === 'create') live.set(e.k, e.policy!)
      else live.delete(e.k)
    }
  }
  return [...live.values()]
}

const DROPPED_BY = '20260715000004_fix_permissive_rls.sql'

describe('no policy grants everything to everyone', () => {
  const policies = livePolicies()

  it('found policies to check (guards the parser itself)', () => {
    // A regex that silently matches nothing would make every test below pass.
    expect(policies.length).toBeGreaterThan(50)
  })

  it('NO write-capable policy uses using(true) without a TO clause', () => {
    // The bug, exactly: `for all using (true)` with no TO applies to PUBLIC, and
    // permissive policies are OR'd — so it overrides every founder-scoped policy
    // on the same table. The service role never needs one: it has BYPASSRLS.
    const offenders = policies.filter(p => {
      const s = p.statement.replace(/\s+/g, ' ')
      const permissive = /using\s*\(\s*true\s*\)/i.test(s)
      if (!permissive) return false

      // A public SELECT is a legitimate design choice (demo_investors,
      // sector_weight_profiles, the academy tables). A public WRITE is not.
      const writeCapable = /for\s+(all|insert|update|delete)/i.test(s) || !/for\s+select/i.test(s)
      if (!writeCapable) return false

      const scoped = /\bto\s+service_role\b/i.test(s)
        || /auth\.role\(\)\s*=\s*'service_role'/i.test(s)
      return !scoped
    })

    expect(offenders.map(o => `${o.table} — "${o.name}" (${o.file})`)).toEqual([])
  })

  it('the four known-broken policies are dropped', () => {
    const fix = readFileSync(join(MIGRATIONS, DROPPED_BY), 'utf8')
    for (const table of ['scheduled_actions', 'agent_goals', 'delegation_tasks', 'founder_metric_snapshots']) {
      expect(fix).toMatch(new RegExp(`drop policy if exists "[Ss]ervice role full access" on ${table}`, 'i'))
    }
  })

  it('RLS stays enabled on all four after the drop', () => {
    // Dropping a policy does not disable RLS — but a table with RLS off and no
    // policies is wide open, and that failure looks identical from outside.
    const fix = executable(readFileSync(join(MIGRATIONS, DROPPED_BY), 'utf8'))
    for (const table of ['scheduled_actions', 'agent_goals', 'delegation_tasks', 'founder_metric_snapshots']) {
      expect(fix).toMatch(new RegExp(`alter table ${table}\\s+enable row level security`, 'i'))
    }
  })
})

describe('the new-model tables are scoped to their owner', () => {
  const NEW_TABLES = ['strategy_sessions', 'executive_contracts', 'programs', 'asset_versions', 'executive_briefings', 'operating_rhythm_runs']

  it.each(NEW_TABLES)('%s has founder-scoped policies and no escape hatch', table => {
    const policies = livePolicies().filter(p => p.table === table)
    expect(policies.length).toBeGreaterThan(0)
    for (const p of policies) {
      expect(p.statement).not.toMatch(/using\s*\(\s*true\s*\)/i)
      expect(p.statement).toMatch(/auth\.uid\(\)\s*=\s*founder_id/i)
    }
  })

  it.each(NEW_TABLES)('%s has no DELETE policy — history is append-only', table => {
    const policies = livePolicies().filter(p => p.table === table)
    expect(policies.filter(p => /for\s+delete/i.test(p.statement))).toEqual([])
  })
})

// ─── FU-008 — every table created here must enable RLS ────────────────────────

describe('no table is created without RLS (the base-grant safety condition)', () => {
  /**
   * 20260727000002 grants `authenticated` read/write on ALL tables in public, because Postgres
   * checks grants BEFORE row policies and nothing else was granting them — a database built from
   * these migrations was unusable without it.
   *
   * That grant is safe ONLY while every table has RLS enabled. It is not a belt-and-braces
   * nicety: `qscore_history_dedup_audit` shipped without RLS, and the blanket grant would have
   * exposed every founder's user_id and score history to any logged-in user. This test is the
   * condition that keeps the grant honest — the next table that forgets RLS fails here rather
   * than quietly becoming readable by every tenant.
   */
  const tablesCreated = (): Array<{ table: string; file: string }> => {
    const found: Array<{ table: string; file: string }> = []
    for (const file of migrationFiles()) {
      const sql = executable(readFileSync(join(MIGRATIONS, file), 'utf8'))
      for (const m of sql.matchAll(/create table (?:if not exists )?([a-z_][a-z0-9_]*)/gi)) {
        found.push({ table: m[1].toLowerCase(), file })
      }
    }
    return found
  }

  it('every table created by a migration also enables row level security somewhere', () => {
    const allSql = migrationFiles()
      .map(f => executable(readFileSync(join(MIGRATIONS, f), 'utf8')))
      .join('\n')

    const missing = [...new Set(tablesCreated().map(t => t.table))].filter(table => {
      const enabled = new RegExp(`alter table (?:if exists )?(?:public\\.)?${table}\\s+enable row level security`, 'i')
      return !enabled.test(allSql)
    })

    expect(missing).toEqual([])
  })
})
