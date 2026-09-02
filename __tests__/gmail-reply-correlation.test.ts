/**
 * Correlating a reply back to the outreach this product sent.
 *
 * The whole feature rests on one identity: the RFC-5322 `Message-ID` that `send.ts` injects is
 * derived from the idempotency key, which is `action_log.payload_hash`, which is kept forever.
 * So any past send is findable in the mailbox with no correlation table at all.
 *
 * Two properties carry the weight, and both fail SILENTLY if broken — no error, no failing
 * request, just a feature that never finds anything:
 *
 *  1. ONE IMPLEMENTATION of the id. A second copy that drifts by one character breaks the join
 *     permanently, for every send already in the wild.
 *  2. MATCHING ON HEADERS, NOT SENDERS. A founder replying to themselves — which is exactly how
 *     this gets tested first — has the same address on both sides. Sender matching finds nothing
 *     and looks like "no replies yet".
 */

import { messageIdFor, rfc822Query, __messageIdFor } from '@/lib/connectors/gmail/send'
import { isReplyTo } from '@/lib/connectors/gmail/replies'

describe('the Message-ID is the join key', () => {
  it('is deterministic — the same key always yields the same id', () => {
    // If this ever stopped being true, a send could never be found again after the fact.
    expect(messageIdFor('payload-hash-abc')).toBe(messageIdFor('payload-hash-abc'))
  })

  it('different sends get different ids', () => {
    expect(messageIdFor('hash-a')).not.toBe(messageIdFor('hash-b'))
  })

  it('is a well-formed RFC-5322 id, angle brackets included', () => {
    const id = messageIdFor('payload-hash-abc')
    expect(id).toMatch(/^<[0-9a-f]{32}@.+>$/)
  })

  it('⚠️ there is exactly one implementation — the test-only alias is the same function', () => {
    // Guards the failure this file exists to prevent: two copies, one of them drifting.
    expect(__messageIdFor).toBe(messageIdFor)
  })

  it('the search query strips the angle brackets, and nothing else', () => {
    // Gmail's rfc822msgid: operator rejects the brackets, but the header value carries them —
    // one shared helper so the two halves can never disagree about that.
    const id = messageIdFor('k')
    expect(rfc822Query(id)).toBe(`rfc822msgid:${id.slice(1, -1)}`)
    expect(rfc822Query(id)).not.toContain('<')
    expect(rfc822Query(id)).not.toContain('>')
  })
})

describe('isReplyTo — which thread messages count as a reply', () => {
  const SENT_ID = '<abc123@edgealpha.vc>'
  const SENT_GMAIL_ID = 'gmail-msg-1'

  const msg = (id: string, headers: Record<string, string> = {}) => ({
    id,
    payload: { headers: Object.entries(headers).map(([name, value]) => ({ name, value })) },
  })

  it('excludes our own copy of the outgoing message', () => {
    expect(isReplyTo(msg(SENT_GMAIL_ID), SENT_ID, SENT_GMAIL_ID)).toBe(false)
  })

  it('includes a message whose In-Reply-To names our id', () => {
    expect(isReplyTo(msg('m2', { 'In-Reply-To': SENT_ID }), SENT_ID, SENT_GMAIL_ID)).toBe(true)
  })

  it('includes a message that names our id only in References', () => {
    // Deeper in a thread, clients drop In-Reply-To but keep the full References chain.
    const headers = { References: `<older@x.com> ${SENT_ID} <newer@y.com>` }
    expect(isReplyTo(msg('m3', headers), SENT_ID, SENT_GMAIL_ID)).toBe(true)
  })

  it('excludes an unrelated message that happens to share the thread', () => {
    expect(isReplyTo(msg('m4', { 'In-Reply-To': '<other@z.com>' }), SENT_ID, SENT_GMAIL_ID)).toBe(false)
  })

  it('excludes a message with no threading headers at all', () => {
    // A forward, a self-note, or a draft sitting in the thread — all would inflate a naive
    // "the thread has more than one message" test.
    expect(isReplyTo(msg('m5'), SENT_ID, SENT_GMAIL_ID)).toBe(false)
  })

  it('⚠️ INCLUDES a self-reply, where the sender is our own address', () => {
    // The case the first live proof depends on: Mo sends to Mo and replies. Sender-based
    // matching would drop this and the feature would look broken while being "correct".
    const selfReply = msg('m6', {
      From: 'Mo <mo@innosphere.ventures>',
      'In-Reply-To': SENT_ID,
    })
    expect(isReplyTo(selfReply, SENT_ID, SENT_GMAIL_ID)).toBe(true)
  })

  it('matches the header name case-insensitively, as RFC-5322 permits', () => {
    expect(isReplyTo(msg('m7', { 'in-reply-to': SENT_ID }), SENT_ID, SENT_GMAIL_ID)).toBe(true)
  })
})
