/**
 * F09 — the Executive Command View.
 *
 * The state machine is the feature: it turns F05–F08 from four disconnected
 * pieces into one thing a founder can do. These tests pin the states, and pin the
 * two things easiest to get wrong later — fabricating a date, and rebuilding the
 * approval gate the PRD deleted.
 */

import { readFileSync } from 'fs'
import {
  resolveMandateState,
  type Contract,
  type Strategy,
} from '@/features/executive/types/executive.types'

const strategy = (over: Partial<Strategy> = {}): Strategy => ({
  id: 's1', version: 1, mission: 'Cut procurement overhead.',
  priorities: ['Win design partners'], goals: [], ...over,
})

const contract = (over: Partial<Contract> = {}): Contract => ({
  id: 'c1', epoch: 1, version: 1, status: 'confirmed',
  priorities: [], successMetrics: [], responsibilities: [], activePrograms: ['P001'],
  confirmedAt: '2026-07-15T00:00:00Z', createdAt: '', ...over,
})

// ─── The state machine (F09's whole job) ──────────────────────────────────────

describe('resolveMandateState — one thing to do next, always', () => {
  it.each([
    ['nothing set at all',            null,          null,                                    'no_strategy'],
    ['strategy but no mandate',       strategy(),    null,                                    'no_contract'],
    ['a mandate is drafted',          strategy(),    contract({ status: 'draft' }),           'draft'],
    ['the mandate is confirmed',      strategy(),    contract({ status: 'confirmed' }),       'confirmed'],
  ])('%s -> %s', (_label, s, c, expected) => {
    expect(resolveMandateState(s, c)).toBe(expected)
  })

  it('a draft outranks a missing strategy — never strand a founder mid-flow', () => {
    // If a strategy read fails but a draft exists, show the draft rather than
    // sending them back to square one to redo work they have already done.
    expect(resolveMandateState(null, contract({ status: 'draft' }))).toBe('draft')
  })

  it('a superseded contract is not the current state', () => {
    // A superseded contract is history. With no current one, the founder's next
    // action is to draft again.
    expect(resolveMandateState(strategy(), contract({ status: 'superseded' }))).toBe('no_contract')
  })
})

// ─── Command, not approval (ADR-002) ──────────────────────────────────────────

/**
 * Strip comments so a source scan reads CODE, not prose.
 *
 * This file's own comments quote the forbidden phrases in order to warn against
 * them — so without this, the checks below match the warning and fail. The same
 * trap caught the migration test, and the score-invariant guard.
 *
 * (The score-invariant guard makes the OPPOSITE call and scans prose too. That
 * one defends a locked decision where blunt-and-unbypassable beats accurate.
 * These inspect a file's behaviour, where accuracy is the job.)
 *
 * Only whole-line `//` comments are removed, never mid-line — that would mangle a
 * URL inside a string.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')       // /* ... */ and /** ... */
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
}

describe('the page is command, not approval', () => {
  const page = stripComments(readFileSync('app/founder/executive/page.tsx', 'utf8'))

  it('has exactly ONE confirm action, and it is the mandate', () => {
    // ADR-002 removed the per-plan sign-off: the founder confirms once, then
    // redirects by issuing a new mandate. More than one confirm on this page means
    // the gate has been rebuilt.
    const confirms = page.match(/action: 'confirm'/g) ?? []
    expect(confirms).toHaveLength(1)
  })

  it('offers a NEW MANDATE, and has no approval ACTION beyond the one confirm', () => {
    expect(page).toContain('/api/contracts/new-epoch')

    // Assert on actions, not on the word "approve". The page legitimately SAYS
    // "you don't approve their work each week" — that sentence is the whole point
    // of ADR-002, and an earlier version of this test failed on it. What matters
    // is that no approve endpoint is called and no approve control is rendered.
    expect(page).not.toMatch(/fetch\([^)]*approve/i)
    expect(page).not.toMatch(/action:\s*'approve'/i)
    expect(page).not.toMatch(/>\s*Approve\b/i)   // no button labelled "Approve …"
  })

  it('tells the founder plainly what confirming means', () => {
    // They are handing over autonomy. That should be stated, not buried.
    expect(page).toMatch(/run to it without asking\s*\n?\s*\*?\s*again/i)
  })

  it('explains that a new epoch keeps history (ADR-003)', () => {
    expect(page).toMatch(/nothing is overwritten/i)
  })
})

// ─── No fabricated dates ──────────────────────────────────────────────────────

describe('the briefings panel tells the truth', () => {
  const panel = stripComments(readFileSync('features/executive/components/BriefingsPanel.tsx', 'utf8'))

  it('does NOT fabricate a date (real briefing dates are fine, invented ones are not)', () => {
    // F12 wired the panel to real data, so rendering a briefing's actual created_at
    // (new Date(b.createdAt)) is legitimate. What stays forbidden is INVENTING a date
    // the data doesn't support: a "now" stamp (Date.now / new Date() with no argument),
    // or a fabricated next-cycle date ("runs on [date]"). Those were the original lie.
    expect(panel).not.toMatch(/Date\.now|new Date\(\s*\)/)
    expect(panel).not.toMatch(/runs (on|at) /i)
  })

  it('still says plainly that nothing has run, while empty', () => {
    // The empty state (no rhythm has run yet) keeps the honest copy.
    expect(panel).toMatch(/nothing has run yet/i)
  })
})

// ─── The client must not pull in server code ──────────────────────────────────

describe('client boundary', () => {
  it('the UI types do not import from lib/mandate', () => {
    // lib/mandate/** touches Supabase and the Registry. Importing it into a
    // client component drags server code into the browser bundle.
    const types = stripComments(readFileSync('features/executive/types/executive.types.ts', 'utf8'))
    expect(types).not.toMatch(/from '@\/lib\/mandate/)
    expect(types).not.toMatch(/from '@\/lib\/registry/)
  })

  it('the page reads state and calls the API — no reasoning in the frontend', () => {
    // CLAUDE.md §2: the frontend renders state; it never implements executive
    // reasoning.
    const page = stripComments(readFileSync('app/founder/executive/page.tsx', 'utf8'))
    expect(page).not.toMatch(/from '@\/lib\/(mandate|registry|prompts)/)
    expect(page).toContain("fetch('/api/contracts')")
  })
})
