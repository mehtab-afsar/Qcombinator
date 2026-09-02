/**
 * Finding replies to outreach this product itself sent.
 *
 * ─── WHY THIS IS POSSIBLE WITHOUT STORING ANYTHING NEW ───────────────────────────
 * `./send.ts` already makes every send self-identifying: it derives an RFC-5322 `Message-ID`
 * from the idempotency key, which IS `action_log.payload_hash`, which is kept forever. So for
 * any past send we can recompute the exact id that went out, and a reply is simply a message in
 * that thread whose `In-Reply-To`/`References` names it. No correlation table, no bookkeeping.
 *
 * ⚠️ MATCH HEADERS, NOT SENDERS. The obvious rule — "any message in the thread not from us" —
 * breaks the case we most need to work: a founder testing this by replying to themselves has the
 * same address on both sides. Gmail sets `In-Reply-To` even on a self-reply, so header matching
 * succeeds exactly where sender matching silently finds nothing. It is also stricter: a forward,
 * a self-note or a draft sitting in the thread all inflate a naive "more than one message" test.
 *
 * ⚠️ REST, NOT MCP, deliberately. `./read.ts` is the MCP connector for this provider, but its
 * thread shape (`{ id, snippet, body }`) carries no headers at all, so the match above is
 * impossible through it — and its own docstring flags its argument schemas as assumed and never
 * verified against a real account. `send.ts`'s `reconcile` already talks to gmail.googleapis.com
 * directly, so this is that established shape, not a new one.
 *
 * ⚠️ CONTENT DISCIPLINE. `format=metadata` on the thread read, so a body is never fetched — only
 * headers and Gmail's own short `snippet`. A sender comes back as a DOMAIN, never an address
 * (CLAUDE.md §3). What a caller may persist is narrower still; see the signals migration.
 *
 * ⚠️ WHO MAY CALL THIS. Reading a founder's mailbox must trace back to that founder being
 * present — never a cron, never a Rhythm cycle step (ADR-026). See lib/signals/outreach-replies.ts,
 * which is the only caller and is reachable only from a founder-initiated request.
 */

import { log } from '@/lib/logger'
import { ConnectorError, type ResolvedGrant } from '../types'
import { rfc822Query } from './send'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TIMEOUT_MS = 30_000
/** Gmail's own summary line. Capped again by the caller before anything is stored. */
const EXCERPT_MAX = 300

export interface GmailReply {
  /** Gmail's id for the REPLY message. Half of the caller's dedupe key. */
  providerId: string
  /** Domain only — never an address. */
  fromDomain: string | null
  excerpt: string
  repliedAt: string | null
}

/** Gmail returns headers as a name/value list; names are case-insensitive per RFC-5322. */
interface GmailHeader { name: string; value: string }
interface GmailMessage {
  id: string
  internalDate?: string
  snippet?: string
  payload?: { headers?: GmailHeader[] }
}

function header(message: GmailMessage, name: string): string {
  const found = message.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())
  return found?.value ?? ''
}

/**
 * Is this thread message a reply to the message we sent?
 *
 * Exported so the rule is unit-tested directly rather than only through a mocked HTTP round trip —
 * it is the one piece of logic here that can be wrong in a way no integration test would catch.
 */
export function isReplyTo(message: GmailMessage, sentMessageId: string, sentGmailId: string): boolean {
  if (message.id === sentGmailId) return false // our own copy of the outgoing mail
  const refs = `${header(message, 'In-Reply-To')} ${header(message, 'References')}`
  return refs.includes(sentMessageId)
}

/** `"Dana Whitfield <dana@acme.com>"` → `"acme.com"`. Never returns the local part. */
function domainOf(fromHeader: string): string | null {
  const at = fromHeader.lastIndexOf('@')
  if (at === -1) return null
  return fromHeader.slice(at + 1).replace(/[>\s"']/g, '').toLowerCase() || null
}

/**
 * Fails closed and LOUDLY on a send-only grant. Returning `[]` would be indistinguishable from
 * "no replies", so a misconfigured scope would look like a working feature that never finds
 * anything — the failure mode most likely to go unnoticed for months.
 */
function assertReadScope(grant: ResolvedGrant): void {
  const canRead = grant.scopes.some(s => s.includes('gmail.readonly') || s === 'https://mail.google.com/')
  if (!canRead) {
    throw new ConnectorError(
      'insufficient_scope',
      'Reading replies needs gmail.readonly; this grant can only send.',
    )
  }
}

async function gmailGet<T>(grant: ResolvedGrant, path: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${GMAIL_API}${path}`, {
      headers: { Authorization: `Bearer ${grant.accessToken}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      // Never throws on a bad response: detection is a background courtesy, and a Gmail hiccup
      // must not surface to the founder as a broken page.
      log.warn('gmail read failed', { status: res.status, grantId: grant.grantId })
      return null
    }
    return await res.json() as T
  } catch (err) {
    log.warn('gmail read errored', { grantId: grant.grantId, err: (err as Error)?.message })
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Every reply to one sent message, or `[]` if it cannot be determined.
 *
 * @param sentMessageId the verbatim `<...@domain>` from `messageIdFor()` — not a bare digest.
 */
export async function findRepliesTo(grant: ResolvedGrant, sentMessageId: string): Promise<GmailReply[]> {
  assertReadScope(grant)

  // 1. Locate our own sent message, to get its thread and to exclude it from the results.
  const found = await gmailGet<{ messages?: { id: string; threadId: string }[] }>(
    grant, `/messages?q=${encodeURIComponent(rfc822Query(sentMessageId))}&maxResults=5`,
  )
  const sent = found?.messages?.[0]
  if (!sent) return [] // never sent, deleted, or not yet indexed — nothing to report

  // 2. Read the thread's metadata only. No body is ever fetched.
  const headers = ['From', 'In-Reply-To', 'References', 'Date']
    .map(h => `&metadataHeaders=${h}`).join('')
  const thread = await gmailGet<{ messages?: GmailMessage[] }>(
    grant, `/threads/${sent.threadId}?format=metadata${headers}`,
  )
  if (!thread?.messages) return []

  return thread.messages
    .filter(m => isReplyTo(m, sentMessageId, sent.id))
    .map(m => ({
      providerId: m.id,
      fromDomain: domainOf(header(m, 'From')),
      excerpt: (m.snippet ?? '').slice(0, EXCERPT_MAX),
      repliedAt: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
    }))
}
