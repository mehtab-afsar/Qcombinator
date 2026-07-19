/**
 * Pending migrations must be safe to re-run.
 *
 * Schema on this project has often been changed through the Supabase dashboard,
 * with the migration file written afterwards to document it —
 * 20260601000001_missing_agent_tables.sql says so outright: "tables that exist
 * in the live DB but had no migration file... created directly via Supabase
 * dashboard".
 *
 * So a migration cannot assume its objects are absent. One that isn't guarded
 * aborts `db push` PART-WAY THROUGH THE BATCH — leaving some migrations applied,
 * some not, and the history wrong in a new way.
 *
 * That is exactly what `20260605000000_add_investor_configs.sql` would have done.
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const MIGRATIONS = join(__dirname, '..', 'supabase', 'migrations')

/**
 * Comments stripped.
 *
 * A scan that reads prose reports "-- Create index for faster lookups" as a
 * CREATE INDEX. My first pass at this check did exactly that and produced two
 * false positives out of three — it is the same trap that caught the
 * score-invariant guard, the RLS test and the command-view test.
 */
function executable(sql: string): string {
  return sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n')
}

/**
 * Statements with no IF NOT EXISTS form, which therefore need an explicit
 * DROP ... IF EXISTS immediately before them.
 *
 * POLICY and TRIGGER are here because Postgres has no `CREATE POLICY IF NOT
 * EXISTS` or `CREATE TRIGGER IF NOT EXISTS`. My first scan checked only TABLE,
 * INDEX and COLUMN — and missed both.
 */
const NEEDS_EXPLICIT_DROP = [
  { kind: 'POLICY', create: /create\s+policy\s+"([^"]+)"\s+on\s+([a-z_.]+)/gi },
  { kind: 'TRIGGER', create: /create\s+trigger\s+([a-z_]+)[\s\S]*?on\s+([a-z_.]+)/gi },
]

/** Statements that support IF NOT EXISTS and must use it. */
const NEEDS_IF_NOT_EXISTS = [
  { kind: 'CREATE TABLE', re: /create\s+table\s+(?!if\s+not\s+exists)/gi },
  { kind: 'CREATE INDEX', re: /create\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists|concurrently)/gi },
  { kind: 'ADD COLUMN', re: /add\s+column\s+(?!if\s+not\s+exists)/gi },
]

/**
 * Only migrations from the Story 1 era onward.
 *
 * Older files are HISTORY — they ran long ago, on databases that no longer look
 * like this, and rewriting them would change what a rebuild-from-scratch
 * produces. This guards what we add from here on.
 */
const GUARDED_FROM = '20260605000000'

function guardedMigrations(): string[] {
  return readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .filter(f => f.slice(0, 14) >= GUARDED_FROM)
    .sort()
}

describe('pending migrations are safe to re-run', () => {
  it('has migrations to check (guards the check itself)', () => {
    expect(guardedMigrations().length).toBeGreaterThan(5)
  })

  it.each(guardedMigrations())('%s uses IF NOT EXISTS where it can', file => {
    const sql = executable(readFileSync(join(MIGRATIONS, file), 'utf8'))
    const offenders: string[] = []

    for (const { kind, re } of NEEDS_IF_NOT_EXISTS) {
      for (const m of sql.matchAll(re)) {
        offenders.push(`${kind}: ${sql.slice(m.index, m.index + 50).split('\n')[0].trim()}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it.each(guardedMigrations())('%s drops policies/triggers before creating them', file => {
    const sql = executable(readFileSync(join(MIGRATIONS, file), 'utf8'))
    const offenders: string[] = []

    for (const { kind, create } of NEEDS_EXPLICIT_DROP) {
      for (const m of sql.matchAll(create)) {
        const name = m[1]
        // Postgres has no CREATE POLICY/TRIGGER IF NOT EXISTS — the only way to
        // be re-runnable is to drop first.
        const dropped = new RegExp(`drop\\s+${kind}\\s+if\\s+exists\\s+"?${name}"?`, 'i').test(sql)
        if (!dropped) offenders.push(`${kind} "${name}" is created without a preceding DROP IF EXISTS`)
      }
    }

    expect(offenders).toEqual([])
  })
})
