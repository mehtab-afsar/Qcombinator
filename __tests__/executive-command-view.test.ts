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
  resolveJourneyState,
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

describe('resolveJourneyState — one thing to do next, always', () => {
  it.each([
    ['no score, nothing set',         false, null,          null,                              'no_score'],
    ['scored, nothing set',           true,  null,          null,                              'no_strategy'],
    ['strategy but no mandate',       true,  strategy(),    null,                               'no_contract'],
    ['a mandate is drafted',          true,  strategy(),    contract({ status: 'draft' }),      'draft'],
    ['the mandate is confirmed',      true,  strategy(),    contract({ status: 'confirmed' }),  'confirmed'],
  ])('%s -> %s', (_label, hasScore, s, c, expected) => {
    expect(resolveJourneyState(hasScore, s, c)).toBe(expected)
  })

  it('a draft outranks a missing score — never strand a founder mid-flow', () => {
    // If the score read fails but a draft already exists, show the draft rather than
    // sending them back to square one to redo work they have already done.
    expect(resolveJourneyState(false, null, contract({ status: 'draft' }))).toBe('draft')
  })

  it('a draft outranks a missing strategy — never strand a founder mid-flow', () => {
    // If a strategy read fails but a draft exists, show the draft rather than
    // sending them back to square one to redo work they have already done.
    expect(resolveJourneyState(true, null, contract({ status: 'draft' }))).toBe('draft')
  })

  it('a superseded contract is not the current state', () => {
    // A superseded contract is history. With no current one, the founder's next
    // action is to draft again.
    expect(resolveJourneyState(true, strategy(), contract({ status: 'superseded' }))).toBe('no_contract')
  })

  it('an existing strategy is never sent back to the score step, even without one', () => {
    // Shouldn't happen in practice (a strategy implies a score already existed), but if
    // it ever does, don't strand a founder who already did the strategy work.
    expect(resolveJourneyState(false, strategy(), null)).toBe('no_contract')
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
  // The Command View redesign moved the confirmed-state UI (mandate summary, "change
  // direction", roster, actions, rhythm, briefings) out of page.tsx into CommandView.tsx.
  // F07 "the unveiling" then moved the one mandate-confirm action itself (and the copy
  // explaining it) out of page.tsx into Unveiling.tsx / OneConfirm.tsx — these checks now
  // span all four files so a rebuilt gate can't hide by moving files.
  const page = stripComments(readFileSync('app/founder/executive/page.tsx', 'utf8'))
  const commandView = stripComments(readFileSync('features/executive/components/CommandView.tsx', 'utf8'))
  const unveiling = stripComments(readFileSync('features/executive/components/unveiling/Unveiling.tsx', 'utf8'))
  const oneConfirm = stripComments(readFileSync('features/executive/components/unveiling/OneConfirm.tsx', 'utf8'))
  const both = `${page}\n${commandView}\n${unveiling}\n${oneConfirm}`

  it('has exactly ONE confirm action, and it is the mandate', () => {
    // ADR-002 removed the per-plan sign-off: the founder confirms once, then
    // redirects by issuing a new mandate. More than one confirm anywhere in this flow
    // means the gate has been rebuilt.
    const confirms = both.match(/action: 'confirm'/g) ?? []
    expect(confirms).toHaveLength(1)
  })

  it('offers a NEW MANDATE, and has no approval ACTION beyond the one confirm', () => {
    // The literal endpoint call lives on the page (it owns all API calls); CommandView stays
    // presentational and just receives onChangeDirection as a prop.
    expect(page).toContain('/api/contracts/new-epoch')

    // Assert on actions, not on the word "approve". The page legitimately SAYS
    // "you don't approve their work each week" — that sentence is the whole point
    // of ADR-002, and an earlier version of this test failed on it. What matters
    // is that no approve endpoint is called and no approve control is rendered.
    expect(both).not.toMatch(/fetch\([^)]*approve/i)
    expect(both).not.toMatch(/action:\s*'approve'/i)
    expect(both).not.toMatch(/>\s*Approve\b/i)   // no button labelled "Approve …"
  })

  it('tells the founder plainly what confirming means', () => {
    // They are handing over autonomy. That should be stated, not buried. Now lives in
    // OneConfirm.tsx (Layer 5 of the unveiling) — said right before the founder confirms,
    // not buried on the page itself.
    expect(oneConfirm).toMatch(/run to it without asking\s*\n?\s*\*?\s*again/i)
  })

  it('explains that a new epoch keeps history (ADR-003)', () => {
    expect(commandView).toMatch(/nothing is overwritten/i)
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

describe('the score anchor does not fabricate a trend', () => {
  // The UX spec's own copy rule: "never fabricate confidence." ScoreAnchor shows the real
  // overall number only — no invented "up N this month," since that would need the same
  // version-resolution logic dashboard/page.tsx owns, not a guessed shortcut here.
  const anchor = stripComments(readFileSync('features/executive/components/ScoreAnchor.tsx', 'utf8'))

  it('renders the real overall score, not an invented delta', () => {
    expect(anchor).toContain('qScore.overall')
    expect(anchor).not.toMatch(/\bup \d|\bdown \d|change|trend/i)
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

  it('CommandView and ScoreAnchor stay presentational too', () => {
    const commandView = stripComments(readFileSync('features/executive/components/CommandView.tsx', 'utf8'))
    const scoreAnchor = stripComments(readFileSync('features/executive/components/ScoreAnchor.tsx', 'utf8'))
    expect(commandView).not.toMatch(/from '@\/lib\/(mandate|registry|prompts)/)
    expect(scoreAnchor).not.toMatch(/from '@\/lib\/(mandate|registry|prompts)/)
  })
})

// ─── One resolver, not three independent guesses ───────────────────────────────

describe('journey state has exactly one source of truth', () => {
  // The bug this guards: before resolveJourneyState existed, the dashboard door and
  // this page each hand-rolled their own read of "where is the founder," and neither
  // checked Q-Score — which is exactly how a founder with no score ended up looking
  // at "set your direction" as if nothing came before it. Both call sites must import
  // the same function so they can never drift apart again.
  const page = stripComments(readFileSync('app/founder/executive/page.tsx', 'utf8'))
  const door = stripComments(readFileSync('features/executive/components/ExecutiveEntryCard.tsx', 'utf8'))

  it('the Command View imports resolveJourneyState from executive.types', () => {
    expect(page).toMatch(/from '@\/features\/executive\/types\/executive\.types'/)
    expect(page).toContain('resolveJourneyState')
  })

  it('the dashboard door imports resolveJourneyState from the same module', () => {
    expect(door).toMatch(/from '@\/features\/executive\/types\/executive\.types'/)
    expect(door).toContain('resolveJourneyState')
  })

  it('neither call site hand-rolls its own state switch instead of the resolver', () => {
    // A hand-rolled equivalent would check contract.status/strategy directly instead
    // of calling the resolver — that's the exact shape of the original bug.
    expect(page).not.toMatch(/contract\?\.status === 'confirmed'/)
    expect(door).not.toMatch(/contract\?\.status === 'confirmed'/)
  })
})

// ─── The mandate reads plainly, before it's even confirmed (F08 stage 4) ──────

describe('the mandate card shows who takes it on, by real name', () => {
  const card = stripComments(readFileSync('features/executive/components/MandateCard.tsx', 'utf8'))

  it('reads names from the Registry via the API, not a second hardcoded list', () => {
    // 'growth' the Registry id vs 'Patel' the founder-facing name — a hardcoded
    // {growth: 'Growth'} map would be readable but wrong. One Registry, read the
    // same way every other panel on this page already does.
    expect(card).toContain("fetch('/api/executives')")
    expect(card).not.toMatch(/growth:\s*['"]/i) // no id->label map living here
  })

  it('falls back to the raw id rather than hiding a responsibility if the fetch fails', () => {
    expect(card).toContain('nameById.get(r.executive) ?? r.executive')
  })

  it('renders responsibilities, not just priorities and metrics', () => {
    expect(card).toContain('contract.responsibilities')
    expect(card).toMatch(/who takes this on/i)
  })
})

// ─── The one-time reveal (F09 polish) ──────────────────────────────────────────

describe('the team-assembly reveal plays once, not on every visit', () => {
  const commandView = stripComments(readFileSync('features/executive/components/CommandView.tsx', 'utf8'))
  const roster = stripComments(readFileSync('features/executive/components/ExecutiveRoster.tsx', 'utf8'))

  it('decides reveal synchronously, in a lazy useState initializer, not an effect', () => {
    // framer-motion only reads `initial` at MOUNT. Deciding this in a useEffect and then
    // calling setState would flip the value after the component already mounted with the
    // wrong `initial` baked in — the animation would silently never play. This is the
    // exact bug the lazy initializer avoids: it runs once, synchronously, before paint.
    expect(commandView).toMatch(/useState\(\(\)\s*=>\s*firstLandingOnThisContract/)
  })

  it('a broken or disabled localStorage never crashes the page over an animation', () => {
    expect(commandView).toMatch(/try\s*{[\s\S]*localStorage[\s\S]*}\s*catch/)
  })

  it('is keyed by contract id, so a new mandate can earn its own reveal', () => {
    expect(commandView).toContain('contract.id')
    expect(commandView).toContain('command-view-revealed:')
  })

  it('ExecutiveRoster only plays the entrance when explicitly told to', () => {
    expect(roster).toContain('reveal = false')
    expect(roster).toContain("initial={reveal ? 'hidden' : false}")
  })
})
