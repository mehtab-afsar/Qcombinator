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

    for (const f of files) {
      const src = read(f)
      expect(src).not.toContain('signals/outreach-replies')
      expect(src).not.toContain('gmail/replies')
    }
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
