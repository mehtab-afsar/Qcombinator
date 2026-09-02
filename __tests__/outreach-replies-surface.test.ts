/**
 * The ask half of notice-and-ask: what the founder is shown, and what pressing it can do.
 *
 * `getReplySummary` is the read behind both surfaces (the P005 prompt and the dashboard door).
 * Its one non-obvious property is that **"handled" is derived, not stored** — it asks action_log
 * whether a follow-up already ran for this batch. A stored boolean would be a second source of
 * truth for a fact action_log already records, kept honest by hand.
 *
 * The rest are source guards on the two orderings a runtime test cannot see: the sweep firing
 * once per session rather than per cycle step, and the click carrying a key it did not invent.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getReplySummary, followUpDedupeKey } from '@/lib/signals/replies-summary'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

const signal = (id: string, detectedAt: string, repliedAt: string | null = null) =>
  ({ id, detected_at: detectedAt, replied_at: repliedAt })

/**
 * Two different tables answer two different queries here, so the fake dispatches on table name
 * rather than returning one canned result — otherwise "handled" would be testing nothing.
 */
function fakeAdmin(opts: {
  signals?: ReturnType<typeof signal>[]
  signalsError?: boolean
  followUpRun?: { id: string } | null
}): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'outreach_reply_signals') {
        const all = opts.signals ?? []
        const chain = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          // Mirrors the real client: `count` is the true total, `data` only the rows asked for.
          limit: async (n: number) => ({
            data: opts.signalsError ? null : all.slice(0, n),
            count: opts.signalsError ? null : all.length,
            error: opts.signalsError ? { message: 'db down' } : null,
          }),
        }
        return chain
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: opts.followUpRun ?? null, error: null }),
      }
      return chain
    },
  } as unknown as SupabaseClient
}

describe('what the screen is told', () => {
  it('reads one row, not the whole history, to render a count', async () => {
    // A founder with 300 replies must not cost 300 rows to say "300".
    const s = await getReplySummary(fakeAdmin({
      signals: Array.from({ length: 300 }, (_, i) => signal(`s${i}`, `2026-09-0${(i % 9) + 1}T09:00:00Z`)),
    }), 'f1')
    expect(s.count).toBe(300)
  })

  it('counts the replies and dates them from the reply, not the detection', async () => {
    // detected_at is when WE looked; replied_at is when the person actually wrote. The founder
    // cares about theirs.
    const s = await getReplySummary(fakeAdmin({
      signals: [
        signal('s2', '2026-09-03T09:00:00Z', '2026-09-02T18:30:00Z'),
        signal('s1', '2026-09-01T09:00:00Z', '2026-09-01T08:00:00Z'),
      ],
    }), 'f1')

    expect(s.count).toBe(2)
    expect(s.newestAt).toBe('2026-09-02T18:30:00Z')
  })

  it('falls back to detected_at when the reply carried no date', async () => {
    const s = await getReplySummary(fakeAdmin({ signals: [signal('s1', '2026-09-03T09:00:00Z')] }), 'f1')
    expect(s.newestAt).toBe('2026-09-03T09:00:00Z')
  })

  it('is empty, not broken, when there is nothing — the common case for everyone today', async () => {
    const s = await getReplySummary(fakeAdmin({ signals: [] }), 'f1')
    expect(s).toEqual({ count: 0, newestSignalId: null, newestAt: null, handled: false, followUpKey: null })
  })

  it('degrades to empty on a query error rather than throwing at a rendering component', async () => {
    const s = await getReplySummary(fakeAdmin({ signalsError: true }), 'f1')
    expect(s.count).toBe(0)
  })

  it('⚠️ never returns an address', async () => {
    // The table holds a domain by construction; this asserts the summary does not widen it, and
    // in fact does not carry sender information at all — a count does not need one.
    const s = await getReplySummary(fakeAdmin({ signals: [signal('s1', '2026-09-03T09:00:00Z')] }), 'f1')
    expect(JSON.stringify(s)).not.toMatch(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  })
})

describe('⚠️ "handled" is derived from action_log, never stored', () => {
  it('is false while no follow-up run exists for this batch', async () => {
    const s = await getReplySummary(fakeAdmin({
      signals: [signal('s1', '2026-09-03T09:00:00Z')], followUpRun: null,
    }), 'f1')
    expect(s.handled).toBe(false)
  })

  it('is true once one does', async () => {
    const s = await getReplySummary(fakeAdmin({
      signals: [signal('s1', '2026-09-03T09:00:00Z')], followUpRun: { id: 'log1' },
    }), 'f1')
    expect(s.handled).toBe(true)
  })

  it('is keyed on the NEWEST signal, so a new reply re-opens the ask', async () => {
    // The behaviour this buys: drafting follow-ups for two replies and then receiving a third
    // must ask again rather than stay quietly "handled" forever.
    const key = followUpDedupeKey('s3')
    expect(key).toContain('s3')

    const s = await getReplySummary(fakeAdmin({
      signals: [signal('s3', '2026-09-04T09:00:00Z'), signal('s1', '2026-09-01T09:00:00Z')],
    }), 'f1')
    expect(s.newestSignalId).toBe('s3')
    expect(s.followUpKey).toBe(key)
  })

  it('the table has no handled column to drift out of step with', () => {
    const sql = read('supabase/migrations/20260904000001_outreach_reply_signals.sql')
    expect(sql).not.toMatch(/\bhandled\b/)
  })
})

describe('the click carries a key it did not invent', () => {
  const prompt = read('features/executive/components/OutreachRepliesPrompt.tsx')

  it('sends the server-minted key back verbatim, rather than composing one', () => {
    // One definition of the format, server-side. A component building `followup:${id}` itself is
    // a second copy that silently stops deduping the day the format changes.
    expect(prompt).toContain('dedupeKey: replies.followUpKey')
    expect(prompt).not.toContain('followup:')
  })

  it('posts to the direct route, which refuses anything irreversible', () => {
    expect(prompt).toContain('/direct')
    expect(prompt).toContain('method: \'POST\'')
  })

  it('runs follow_up_prospects — an existing, reversible, connector-free Action', () => {
    const { getAction } = jest.requireActual('@/lib/registry')
    const action = getAction('follow_up_prospects')
    expect(action.irreversible).toBe(false)
    expect(action.connector).toBeUndefined()
    expect(prompt).toContain("'follow_up_prospects'")
  })

  it('renders nothing at all when nobody has replied', () => {
    expect(prompt).toContain('if (replies.count === 0) return null')
  })
})

describe('the sweep is founder-attributable and fires once', () => {
  const provider = read('features/executive/hooks/useExecutiveWorkspace.tsx')

  it('⚠️ is guarded by a ref, so a development double-mount cannot fire it twice', () => {
    expect(provider).toContain('sweptRef')
    expect(provider).toContain('if (authLoading || !user || sweptRef.current) return')
  })

  it('⚠️ is NOT keyed on generation — a cycle running does not create replies', () => {
    // The failure this prevents: re-sweeping on every step that lands would turn one page visit
    // into a mailbox poll, which is precisely the autonomous capability ADR-026 defers.
    const effect = provider.slice(provider.indexOf('sweptRef'))
    const deps = effect.slice(effect.indexOf('useEffect'), effect.indexOf('const value'))
    expect(deps).not.toContain('generation')
  })

  it('reads the summary whether or not the sweep found anything', () => {
    expect(provider).toContain('refreshReplies()')
  })

  it('never lets a failed sweep break the page', () => {
    expect(provider).toContain(".catch(() => null)")
  })
})
