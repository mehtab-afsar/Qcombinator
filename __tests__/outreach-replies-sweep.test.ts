/**
 * The sweep that looks for replies.
 *
 * It fires on every founder page load, so the properties that matter are about what it does when
 * there is nothing to find — which is almost always:
 *
 *  1. **It is cheap by default.** For a founder who has never sent outreach — everyone, today —
 *     it must cost one indexed read and ZERO external calls. If that is wrong, every page view in
 *     the product pays for a mailbox search.
 *  2. **It is idempotent.** A reload, a second tab, a retry: the same real reply must produce one
 *     row and one notification, forever. This is the property most likely to break unnoticed,
 *     because the second run still "works" — it just tells the founder again.
 *  3. **It never leaks an address**, and never throws into a page render.
 */

const mockFindReplies = jest.fn()
const mockResolveGrant = jest.fn()
const mockCreateNotification = jest.fn(async (_args: unknown) => {})

jest.mock('@/lib/connectors/gmail/replies', () => ({
  findRepliesTo: (...a: unknown[]) => mockFindReplies(...a),
}))
jest.mock('@/lib/connectors/grants', () => ({
  resolveGrant: (...a: unknown[]) => mockResolveGrant(...a),
}))
jest.mock('@/lib/notifications/create', () => ({
  createNotification: (args: unknown) => mockCreateNotification(args),
}))

import { sweepOutreachReplies } from '@/lib/signals/outreach-replies'

// ─── A hand-rolled chainable, matching contacts-context.test.ts's convention ────────
// Records every table touched so "how much did this cost?" is directly assertable.

interface TableState { rows?: unknown[]; single?: unknown }
let tables: Record<string, TableState> = {}
let touched: string[] = []
let upserted: Record<string, unknown[]> = {}

function admin() {
  const make = (name: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      not: () => chain,
      order: () => chain,
      limit: async () => ({ data: tables[name]?.rows ?? [], error: null }),
      maybeSingle: async () => ({ data: tables[name]?.single ?? null, error: null }),
      upsert: (rows: unknown) => {
        upserted[name] = (upserted[name] ?? []).concat(rows as unknown[])
        return {
          select: async () => ({ data: tables[name]?.rows ?? [], error: null }),
          then: (r: (v: unknown) => unknown) => r({ error: null }),
        }
      },
    }
    return chain
  }
  return {
    from: (name: string) => { touched.push(name); return make(name) },
  } as never
}

const SENT = {
  id: 'al-1', action_id: 'generate_personalized_outreach',
  program_id: 'prog-1', payload_hash: 'hash-1',
}
const GRANT = { grantId: 'g', founderId: 'f1', provider: 'gmail_read', accessToken: 't', accountEmail: 'mo@x.com', scopes: ['https://www.googleapis.com/auth/gmail.readonly'] }
const REPLY = { providerId: 'r-1', fromDomain: 'acme.com', excerpt: 'Sounds good', repliedAt: '2026-09-01T10:00:00Z' }

beforeEach(() => {
  jest.clearAllMocks()
  tables = {}; touched = []; upserted = {}
  mockResolveGrant.mockResolvedValue(GRANT)
  mockFindReplies.mockResolvedValue([])
})

describe('it is cheap when there is nothing to find', () => {
  it('⚠️ a founder who never sent outreach costs ZERO external calls', () => {
    // The common case today, and on every page load. If this regresses, every page view in the
    // product pays for a Gmail search.
    tables.action_log = { rows: [] }

    return sweepOutreachReplies(admin(), 'f1').then(result => {
      expect(result).toEqual({ status: 'skipped', sendsChecked: 0, repliesFound: 0 })
      expect(mockResolveGrant).not.toHaveBeenCalled()
      expect(mockFindReplies).not.toHaveBeenCalled()
    })
  })

  it('checks for sends BEFORE anything else — the cheapest gate goes first', async () => {
    tables.action_log = { rows: [] }
    await sweepOutreachReplies(admin(), 'f1')

    expect(touched[0]).toBe('action_log')
    expect(touched).not.toContain('outreach_reply_signals')
  })

  it('does not look again within the cadence window', async () => {
    tables.action_log = { rows: [SENT] }
    tables.outreach_reply_sweeps = { single: { last_swept_at: new Date().toISOString() } }

    const result = await sweepOutreachReplies(admin(), 'f1')

    expect(result.status).toBe('skipped')
    expect(mockFindReplies).not.toHaveBeenCalled()
  })

  it('reports not_connected — distinctly from "no replies" — when the mailbox is not linked', async () => {
    // Worth its own status: "we cannot look" and "we looked and found nothing" are different
    // things to tell a founder, and only one of them is fixable by them.
    tables.action_log = { rows: [SENT] }
    mockResolveGrant.mockRejectedValue(new Error('no grant'))

    const result = await sweepOutreachReplies(admin(), 'f1')

    expect(result.status).toBe('not_connected')
    expect(mockFindReplies).not.toHaveBeenCalled()
  })
})

describe('when a reply exists', () => {
  beforeEach(() => {
    tables.action_log = { rows: [SENT] }
    mockFindReplies.mockResolvedValue([REPLY])
  })

  it('writes one signal row and notifies once', async () => {
    tables.outreach_reply_signals = { rows: [{ id: 'sig-1' }] } // the upsert returns 1 new row

    const result = await sweepOutreachReplies(admin(), 'f1')

    expect(result).toMatchObject({ status: 'ok', sendsChecked: 1, repliesFound: 1 })
    expect(mockCreateNotification).toHaveBeenCalledTimes(1)
  })

  it('⚠️ a re-sweep finding the SAME reply writes nothing and notifies nobody', async () => {
    // The idempotency proof. `ignoreDuplicates` + `.select()` means only genuinely new rows come
    // back — so a second page load is silent. Without this the founder is told again every reload.
    tables.outreach_reply_signals = { rows: [] } // conflict → nothing returned

    const result = await sweepOutreachReplies(admin(), 'f1')

    expect(result.repliesFound).toBe(0)
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })

  it('keys the row on the send and the reply together, so the key is stable', async () => {
    tables.outreach_reply_signals = { rows: [{ id: 'sig-1' }] }
    await sweepOutreachReplies(admin(), 'f1')

    const [row] = upserted.outreach_reply_signals as Record<string, string>[]
    expect(row.dedupe_key).toBe(`${row.sent_message_id}:r-1`)
    expect(row.sent_action_log_id).toBe('al-1')
  })

  it('⚠️ stores a DOMAIN, never an address', async () => {
    tables.outreach_reply_signals = { rows: [{ id: 'sig-1' }] }
    mockFindReplies.mockResolvedValue([{ ...REPLY, fromDomain: 'acme.com' }])

    await sweepOutreachReplies(admin(), 'f1')

    // Scoped to the REPLY-derived fields. The row legitimately contains an '@' elsewhere: the
    // sent_message_id is the RFC-5322 id we generated ourselves (<hash@edgealpha.vc>), which is a
    // synthetic identifier, not anybody's address.
    const [row] = upserted.outreach_reply_signals as Record<string, string>[]
    expect(row.reply_from_domain).toBe('acme.com')
    expect(row.reply_from_domain).not.toContain('@')
    expect(row.reply_excerpt).not.toContain('@')
  })

  it('always records the sweep, so the cursor advances even on a nil result', async () => {
    tables.outreach_reply_signals = { rows: [] }
    await sweepOutreachReplies(admin(), 'f1')

    // Without this, the cadence gate never advances and every page load hits Gmail.
    expect(upserted.outreach_reply_sweeps).toHaveLength(1)
  })
})

describe('it never breaks the page it fires from', () => {
  it('returns an error status rather than throwing when Gmail blows up', async () => {
    tables.action_log = { rows: [SENT] }
    mockFindReplies.mockRejectedValue(new Error('gmail exploded'))

    await expect(sweepOutreachReplies(admin(), 'f1')).resolves.toMatchObject({ status: 'error' })
  })

  it('a failed notification does not fail the sweep — the rows are still written', async () => {
    tables.action_log = { rows: [SENT] }
    tables.outreach_reply_signals = { rows: [{ id: 'sig-1' }] }
    mockFindReplies.mockResolvedValue([REPLY])
    mockCreateNotification.mockRejectedValue(new Error('notif down') as never)

    await expect(sweepOutreachReplies(admin(), 'f1')).resolves.toMatchObject({ status: 'ok' })
  })
})
