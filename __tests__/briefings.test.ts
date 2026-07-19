/**
 * F12 — Executive Briefings: the latest-per-program logic + the migration's security and
 * append-only guarantees.
 *
 * DB-free (like the other migration tests). The runtime guarantees (append-only trigger
 * rejecting UPDATE/DELETE, the dedupe index, read-only-for-authenticated) are verified
 * against the local DB in the Stage A dry-run and reported honestly.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { pickLatestPerProgram, type Briefing } from '@/lib/briefings/briefings'

const b = (over: Partial<Briefing>): Briefing => ({
  id: 'x', founderId: 'f', programId: 'P1', executionId: 'e', contractId: null,
  verdict: 'v', body: {}, createdAt: '2026-07-20T00:00:00Z', ...over,
})

describe('F12 pickLatestPerProgram', () => {
  it('keeps the first (newest) briefing per program', () => {
    // Input is newest-first (as getBriefings returns).
    const list = [
      b({ id: 'a', programId: 'P1', createdAt: '2026-07-20T03:00:00Z' }),
      b({ id: 'b', programId: 'P2', createdAt: '2026-07-20T02:00:00Z' }),
      b({ id: 'c', programId: 'P1', createdAt: '2026-07-20T01:00:00Z' }), // older P1 — dropped
    ]
    expect(pickLatestPerProgram(list).map(x => x.id)).toEqual(['a', 'b'])
  })

  it('treats an orphaned briefing (null program) as its own row', () => {
    const list = [b({ id: 'a', programId: null }), b({ id: 'b', programId: null })]
    expect(pickLatestPerProgram(list).map(x => x.id)).toEqual(['a', 'b'])
  })

  it('returns [] for no briefings', () => {
    expect(pickLatestPerProgram([])).toEqual([])
  })
})

describe('F12 never touches the Q-Score (ADR-005)', () => {
  it('lib/briefings does not name the score signal', () => {
    // Belt-and-braces alongside score-invariant.test.ts, which now scans lib/briefings.
    const src = readFileSync(join(__dirname, '..', 'lib', 'briefings', 'briefings.ts'), 'utf8')
    expect(src).not.toMatch(/applyAgentScoreSignal/)
  })
})

describe('F12 migration — append-only + server-side-only writes', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20260715000007_executive_briefings.sql'),
    'utf8',
  )
  const executable = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('creates NO authenticated write policy (direct writes RLS-denied)', () => {
    const kinds = (executable.match(/create\s+policy\s+"[^"]+"\s+on\s+executive_briefings\s+for\s+(\w+)/gi) ?? [])
      .map(m => m.match(/for\s+(\w+)/i)![1].toLowerCase())
    expect(kinds).toEqual(['select']) // exactly one policy, SELECT-only
  })

  it('installs an append-only trigger on UPDATE and DELETE', () => {
    expect(executable).toMatch(/create\s+trigger\s+executive_briefings_no_mutation[\s\S]*?before\s+update\s+or\s+delete\s+on\s+executive_briefings/i)
  })

  it('dedupes one briefing per Program per run', () => {
    expect(executable).toMatch(/unique\s+index[\s\S]*?executive_briefings[\s\S]*?\(program_id,\s*execution_id\)\s+where\s+execution_id\s+is\s+not\s+null/i)
  })

  it('stamps the governing contract for the epoch (ADR-022)', () => {
    expect(executable).toMatch(/contract_id\s+uuid\s+references\s+executive_contracts\(id\)/i)
  })

  it('requires a verdict (F12 acceptance)', () => {
    expect(executable).toMatch(/verdict\s+text\s+not\s+null/i)
  })
})
