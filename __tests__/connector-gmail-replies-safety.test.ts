/**
 * Safety properties of reading a founder's mailbox for replies.
 *
 * Reading someone's inbox is the most invasive thing this product does, so the constraints are
 * narrow on purpose and each one is pinned here:
 *
 *  1. A send-only grant fails LOUDLY. Returning `[]` would be indistinguishable from "no replies
 *     yet", so a scope misconfiguration would look like a working feature that simply never finds
 *     anything — invisible for months.
 *  2. A body is NEVER fetched. `format=metadata` only; Gmail's own short snippet is all a draft
 *     needs.
 *  3. A sender leaves as a DOMAIN, never an address (CLAUDE.md §3).
 *  4. A Gmail outage never throws at the caller — detection is a background courtesy and must not
 *     surface to a founder as a broken page.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { findRepliesTo } from '@/lib/connectors/gmail/replies'
import { messageIdFor } from '@/lib/connectors/gmail/send'
import { ConnectorError, type ResolvedGrant } from '@/lib/connectors/types'

const SENT_ID = messageIdFor('payload-hash-1')

const grant = (scopes: string[]): ResolvedGrant => ({
  grantId: 'g1',
  founderId: 'f1',
  provider: 'gmail_read',
  accessToken: 'tok',
  accountEmail: 'mo@innosphere.ventures',
  scopes,
})

const READ = grant(['https://www.googleapis.com/auth/gmail.readonly'])
const SEND_ONLY = grant(['https://www.googleapis.com/auth/gmail.send'])

const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks() })

/** Replies with the sent message, then the thread — the two calls findRepliesTo makes. */
function mockGmail(thread: unknown) {
  const calls: string[] = []
  global.fetch = jest.fn(async (url: string) => {
    calls.push(String(url))
    const body = String(url).includes('/threads/')
      ? thread
      : { messages: [{ id: 'sent-1', threadId: 'thr-1' }] }
    return { ok: true, json: async () => body } as unknown as Response
  }) as unknown as typeof fetch
  return calls
}

describe('scope', () => {
  it('⚠️ a send-only grant throws insufficient_scope — never a silent empty list', async () => {
    await expect(findRepliesTo(SEND_ONLY, SENT_ID)).rejects.toThrow(ConnectorError)
    await expect(findRepliesTo(SEND_ONLY, SENT_ID)).rejects.toMatchObject({ code: 'insufficient_scope' })
  })

  it('never reaches the network without read scope', async () => {
    const spy = jest.fn()
    global.fetch = spy as unknown as typeof fetch
    await findRepliesTo(SEND_ONLY, SENT_ID).catch(() => {})
    expect(spy).not.toHaveBeenCalled()
  })

  it('the broader mail.google.com scope is accepted too', async () => {
    mockGmail({ messages: [] })
    await expect(findRepliesTo(grant(['https://mail.google.com/']), SENT_ID)).resolves.toEqual([])
  })
})

describe('what it asks Gmail for', () => {
  it('⚠️ reads thread METADATA only — a body is never fetched', async () => {
    const calls = mockGmail({ messages: [] })
    await findRepliesTo(READ, SENT_ID)

    const threadCall = calls.find(c => c.includes('/threads/'))!
    expect(threadCall).toContain('format=metadata')
    expect(threadCall).not.toContain('format=full')
    expect(threadCall).not.toContain('format=raw')
  })

  it('finds the sent message by its own Message-ID, brackets stripped', async () => {
    const calls = mockGmail({ messages: [] })
    await findRepliesTo(READ, SENT_ID)

    const search = calls[0]
    expect(search).toContain('rfc822msgid')
    expect(decodeURIComponent(search)).toContain(SENT_ID.slice(1, -1))
    expect(decodeURIComponent(search)).not.toContain('<')
  })
})

describe('what comes back', () => {
  const threadWithReply = {
    messages: [
      { id: 'sent-1', payload: { headers: [{ name: 'From', value: 'Mo <mo@innosphere.ventures>' }] } },
      {
        id: 'reply-1',
        internalDate: '1756800000000',
        snippet: 'Sounds interesting — can we talk Thursday?',
        payload: {
          headers: [
            { name: 'From', value: 'Dana Whitfield <dana@acme.com>' },
            { name: 'In-Reply-To', value: SENT_ID },
          ],
        },
      },
    ],
  }

  it('returns the reply, excluding our own sent copy', async () => {
    mockGmail(threadWithReply)
    const replies = await findRepliesTo(READ, SENT_ID)

    expect(replies).toHaveLength(1)
    expect(replies[0].providerId).toBe('reply-1')
    expect(replies[0].excerpt).toContain('Thursday')
    expect(replies[0].repliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('⚠️ the sender is a DOMAIN — the address never leaves this function', async () => {
    mockGmail(threadWithReply)
    const [reply] = await findRepliesTo(READ, SENT_ID)

    expect(reply.fromDomain).toBe('acme.com')
    expect(JSON.stringify(reply)).not.toContain('dana@acme.com')
    expect(reply.fromDomain).not.toContain('@')
  })

  it('caps the excerpt rather than carrying an unbounded string', async () => {
    mockGmail({
      messages: [{
        id: 'r', snippet: 'x'.repeat(5_000),
        payload: { headers: [{ name: 'In-Reply-To', value: SENT_ID }] },
      }],
    })
    const [reply] = await findRepliesTo(READ, SENT_ID)
    expect(reply.excerpt.length).toBeLessThanOrEqual(300)
  })
})

describe('it never breaks the caller', () => {
  it('returns [] when the send is not in the mailbox at all', async () => {
    global.fetch = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch
    await expect(findRepliesTo(READ, SENT_ID)).resolves.toEqual([])
  })

  it('returns [] rather than throwing when Gmail errors', async () => {
    global.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch
    await expect(findRepliesTo(READ, SENT_ID)).resolves.toEqual([])
  })

  it('returns [] rather than throwing when the network drops', async () => {
    global.fetch = (async () => { throw new Error('ECONNRESET') }) as unknown as typeof fetch
    await expect(findRepliesTo(READ, SENT_ID)).resolves.toEqual([])
  })
})

describe('who is allowed to call it', () => {
  it('is reachable only from the founder-triggered sweep, never from a cycle', () => {
    // ADR-026: a Rhythm step must make no live external call. The sweep module is the one caller,
    // and lib/rhythm/** must never import it (pinned separately in the ADR guard test).
    const root = join(__dirname, '..')
    const importers = ['lib/signals/outreach-replies.ts']
    for (const f of importers) {
      try {
        expect(readFileSync(join(root, f), 'utf8')).toContain('gmail/replies')
      } catch {
        // Stage 3 has not landed yet; the ADR guard test is what pins the negative direction.
      }
    }
    expect(readFileSync(join(root, 'lib/connectors/gmail/replies.ts'), 'utf8'))
      .toContain('never a Rhythm cycle step')
  })
})
