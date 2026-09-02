/**
 * The architectural lines this feature must not cross.
 *
 * Reply detection is the first thing in this product that observes the outside world without a
 * founder pressing a button, so it sits one step from two decisions that were made deliberately
 * and closed. These tests are how they stay closed — and they are static, reading files off disk,
 * because the failures they guard are ones no runtime test would catch: an import added in the
 * wrong place still compiles, still passes, and quietly reopens a decision nobody meant to reopen.
 *
 *  1. **ADR-028 — a cycle is fed by founder activity.** A signal in `lib/rhythm/delta.ts` would
 *     flip `hasNewInput` and make a detected reply CAUSE asset regeneration. Modelled on
 *     `__tests__/stripe-context.test.ts`'s last describe block, which guards the same line for
 *     Stripe.
 *  2. **ADR-026 — a Rhythm step makes no live external call.** The connector-calling module and
 *     the passive table read are separate files precisely so this is checkable.
 *  3. **ADR-009 / F15 — the Outcome Loop is deferred.** A reply is not an outcome that moves a
 *     score. Nothing here may reach the score.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { readdirSync } from 'fs'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

describe('ADR-028 — a detected reply never causes regeneration', () => {
  it('⚠️ lib/rhythm/delta.ts stays free of any reply or signal reference', () => {
    // The delta digest decides `hasNewInput`, which decides whether an asset is regenerated. A
    // reply appearing there would make the outside world drive the cycle — the "autonomous
    // external signal" capability ADR-028 records as an open question and says not to build
    // pre-emptively. Detection notifies; the founder's click is what starts work.
    const delta = read('lib/rhythm/delta.ts').toLowerCase()

    expect(delta).not.toContain('reply')
    expect(delta).not.toContain('replies')
    expect(delta).not.toContain('outreach')
    expect(delta).not.toContain('lib/signals')
  })
})

describe('ADR-026 — no Rhythm step makes a live external call', () => {
  it('⚠️ the context reader is a plain table read — no fetch, no connector', () => {
    // This is the file a cycle actually touches. Byte-for-byte the assertion
    // lib/connectors/context.ts earns for the Stripe equivalent.
    const context = read('lib/signals/context.ts')

    expect(context).toContain("from('outreach_reply_signals')")
    expect(context).not.toContain('fetch(')
    expect(context).not.toContain('gmail.googleapis.com')
    expect(context).not.toContain('@/lib/connectors')
  })

  it('⚠️ lib/rhythm/** imports only the context reader, never the sweep', () => {
    // The sweep calls Gmail. If anything under lib/rhythm imported it — even without calling it —
    // the separation would be one line from collapsing, and nothing else would notice.
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const p = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(p)
        else if (entry.name.endsWith('.ts')) files.push(p)
      }
    }
    walk('lib/rhythm')

    // Asserts on IMPORT STATEMENTS, not raw text: these files legitimately name the sweep in
    // prose to explain why they must not import it, and a substring scan would fail on the very
    // comment documenting the rule. What matters is the module graph, so that is what is checked.
    const importLines = (src: string) =>
      src.split('\n').filter(l => /^\s*(import|export)\b.*\bfrom\s+['"]/.test(l))

    for (const f of files) {
      for (const line of importLines(read(f))) {
        expect(line).not.toContain('signals/outreach-replies')
        expect(line).not.toContain('gmail/replies')
      }
    }
  })

  it('the one signals import a Rhythm file may have is the passive context reader', () => {
    const src = read('lib/rhythm/action-context.ts')
    expect(src).toContain("from '@/lib/signals/context'")
  })

  it('the sweep says plainly who may call it', () => {
    const sweep = read('lib/signals/outreach-replies.ts')
    expect(sweep).toContain('Never a cron, never a cycle step')
  })
})

describe('ADR-009 / F15 — this is not the Outcome Loop', () => {
  it('⚠️ nothing under lib/signals reaches the score', () => {
    // F15 verbatim: "no outcome→score mapping". A reply feeds the founder's attention and one
    // Action's context; it is never aggregated and never scored.
    for (const f of readdirSync(join(root, 'lib/signals'))) {
      const src = read(`lib/signals/${f}`)
      expect(src).not.toContain('applyAgentScoreSignal')
      expect(src).not.toContain('agent-signal')
      expect(src).not.toContain('qscore_history')
    }
  })

  it('the forbidden shapes are absent by name', () => {
    // F15 names these explicitly. Their absence is the check.
    expect(existsSync(join(root, 'lib/outcomes'))).toBe(false)
    expect(existsSync(join(root, 'app/api/outcomes'))).toBe(false)
  })

  it('the migration does not touch the score, and says why', () => {
    const sql = read('supabase/migrations/20260904000001_outreach_reply_signals.sql')
    expect(sql).not.toContain('qscore_history')
    expect(sql).toContain('NOT THE OUTCOME LOOP')
  })
})

describe('the table keeps action_log\'s discipline', () => {
  const sql = () => read('supabase/migrations/20260904000001_outreach_reply_signals.sql')

  it('is append-only, with the cascade carve-out that keeps erasure possible', () => {
    expect(sql()).toContain('pg_trigger_depth() > 1')
    expect(sql()).toContain('is append-only')
  })

  it('has RLS on and no write policy — a founder cannot manufacture a signal', () => {
    const s = sql()
    expect(s).toContain('enable row level security')
    expect(s).toMatch(/for select/i)
    expect(s).not.toMatch(/for (insert|update|delete)/i)
  })
})

describe('ADR-039 — the decision is written down where the next person will look', () => {
  // A rule that lives only in a docstring gets read by whoever opens that file, which is not the
  // person about to add a cron. It has to be in the log, and the file has to point at it.
  const log = read('docs/DecisionLog.md')

  it('the ADR exists, is locked, and rejects a cron by name', () => {
    expect(log).toContain('## ADR-039')
    expect(log).toMatch(/## ADR-039[^\n]*🔒/)
    expect(log).toMatch(/\*\*A cron sweep\*\*/)
  })

  it('it closes the question ADR-038 explicitly left open for Gmail-read', () => {
    // ADR-038: "PostHog and Gmail-read ... Each needs its own decision; this ADR does not grant
    // them." An ADR that does grant one must say which.
    const adr = log.slice(log.indexOf('## ADR-039'))
    expect(adr).toContain('ADR-038')
  })

  it('it states both lines it depends on — no regeneration, no cycle-step connector call', () => {
    const adr = log.slice(log.indexOf('## ADR-039'))
    expect(adr).toContain('delta.ts')
    expect(adr).toContain('ADR-026')
    expect(adr).toContain('ADR-028')
  })

  it('and says this is not the Outcome Loop, so F15 is not quietly widened', () => {
    const adr = log.slice(log.indexOf('## ADR-039'))
    expect(adr).toMatch(/F15/)
  })

  it('⚠️ the connector docstring points at it, so the rule is not only in the log', () => {
    // The specific failure: someone opens gmail/read.ts, reads "a founder's own click", sees a
    // page-load sweep in the codebase, concludes the rule is dead, and adds the cron.
    // Whitespace-normalised: the sentence wraps across a comment line, and a test that breaks
    // when someone rewraps a paragraph is a test people delete.
    const src = read('lib/connectors/gmail/read.ts').replace(/\s*\n\s*\*\s*/g, ' ')
    expect(src).toContain('ADR-039')
    expect(src).toMatch(/cron and a cycle step remain prohibited/i)
  })
})
