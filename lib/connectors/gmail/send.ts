/**
 * F13 — Gmail, the FIRST Connector. Not a special case: everything provider-specific lives here,
 * and the layer above it knows only the `Connector` interface.
 *
 * ─── THE HARD CASE THIS FILE EXISTS TO SOLVE ─────────────────────────────────────
 * Gmail has no idempotency key (unlike Stripe). So a timeout leaves a genuinely unanswerable
 * question: did the message send? Retrying risks a duplicate; not retrying risks the founder
 * believing an email went out when it did not.
 *
 * The answer is to make the send SELF-IDENTIFYING before it happens. We generate the RFC-5322
 * `Message-ID` ourselves from the payload hash, and Gmail preserves it. So "did it send?"
 * stops being a guess and becomes a query: search sent mail for that id.
 *
 * ⚠️ `reconcile` needs `gmail.readonly` or a broader scope to search. We hold `gmail.send` ONLY
 * (least privilege, ADR-032/§9), so reconciliation returns null — "the provider could not tell
 * us" — and the outcome stays `unknown`, surfaced honestly to the founder. Widening the scope
 * to make reconciliation automatic is a real trade-off (read access to the whole mailbox) and
 * must be a deliberate decision, not a convenience. Recorded in F13_F14_DESIGN.md §11.
 */

import { createHash } from 'crypto'
import { log } from '@/lib/logger'
import { APP_DOMAIN } from '@/lib/constants/app'
import { assertRecipientsAllowed } from '../allowlist'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from '../types'

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const TIMEOUT_MS = 30_000

/**
 * A deterministic Message-ID derived from the idempotency key.
 *
 * Deterministic so the SAME logical send always produces the SAME id — that is what makes it
 * findable after an ambiguous failure. A random id would be unrecoverable exactly when it
 * matters.
 *
 * ⚠️ THERE MUST ONLY EVER BE ONE IMPLEMENTATION OF THIS. It is the join key between a send and
 * anything that later looks for that send in the mailbox — reconcile() below, and reply
 * detection in ./replies.ts. `action_log.payload_hash` is the idempotency key and is kept
 * forever, so the id is recomputable for any past send. A second copy that drifts by one
 * character would break that correlation silently and permanently, with no failing test and no
 * error — every reply would simply never be found. Import this function; never re-derive it.
 *
 * ⚠️ Depends on APP_DOMAIN. Changing the app's domain makes every previously-sent message
 * uncorrelatable, because the id we would recompute no longer matches the one Gmail stored.
 */
export function messageIdFor(idempotencyKey: string): string {
  const digest = createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32)
  return `<${digest}@${APP_DOMAIN}>`
}

/**
 * Gmail's search syntax for "the message carrying this RFC-5322 Message-ID". The angle brackets
 * are part of the header value but must not appear in the query — shared so the search half and
 * the id half can never disagree about that.
 */
export function rfc822Query(messageId: string): string {
  return `rfc822msgid:${messageId.replace(/[<>]/g, '')}`
}

/** RFC-5322 message, base64url-encoded as Gmail's API requires. */
function buildRawMessage(request: ConnectorRequest, from: string | null): string {
  const to = request.recipients.map(r => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', ')
  const headers = [
    `To: ${to}`,
    from ? `From: ${from}` : null,
    `Subject: ${request.subject}`,
    `Message-ID: ${messageIdFor(request.idempotencyKey)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ].filter(Boolean).join('\r\n')

  return Buffer.from(`${headers}\r\n\r\n${request.body}`)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const gmailConnector: Connector = {
  provider: 'gmail',
  // gmail.send can send and CANNOT read the mailbox. If a future feature needs to read replies,
  // that is a new scope, a new consent and a new argument — not a quiet widening here.
  scopes: ['https://www.googleapis.com/auth/gmail.send'],

  async send(grant: ResolvedGrant, request: ConnectorRequest): Promise<ConnectorOutcome> {
    // THE LAST GATE before a real inbox. Throws outside production for any non-allowlisted
    // recipient — deliberately before the network call, and deliberately all-or-nothing.
    assertRecipientsAllowed(request.recipients)

    if (request.recipients.length === 0) {
      // Not an error: an Action with no contacts is a valid, honest outcome (see the
      // interview_customers prompt). It simply has nothing to do.
      return { status: 'rejected', reason: 'no recipients' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(GMAIL_SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${grant.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: buildRawMessage(request, grant.accountEmail) }),
        signal: controller.signal,
      })

      if (res.ok) {
        const data = await res.json() as { id?: string }
        return { status: 'sent', providerId: data.id ?? messageIdFor(request.idempotencyKey) }
      }

      // 4xx is deterministic — the same request will fail the same way, so it is a rejection,
      // not an unknown. 5xx may or may not have been processed before failing.
      const reason = `gmail returned ${res.status}`
      if (res.status >= 400 && res.status < 500) {
        log.warn('gmail rejected a send', { status: res.status, grantId: grant.grantId })
        return { status: 'rejected', reason }
      }
      log.error('gmail send outcome unknown', { status: res.status, grantId: grant.grantId })
      return { status: 'unknown', reason }
    } catch (err) {
      // A timeout or a dropped connection. We genuinely do not know whether Gmail accepted it,
      // and saying 'failed' here would be a lie the audit log carries forever.
      const reason = (err as Error)?.name === 'AbortError' ? 'timed out' : 'network error'
      log.error('gmail send outcome unknown', { reason, grantId: grant.grantId })
      return { status: 'unknown', reason }
    } finally {
      clearTimeout(timer)
    }
  },

  async reconcile(grant: ResolvedGrant, idempotencyKey: string): Promise<boolean | null> {
    // Searching sent mail needs read access; we hold `gmail.send` only, on purpose. Returning
    // null keeps the outcome honestly `unknown` rather than guessing — and guessing "not sent"
    // would authorise a retry that could double-send.
    if (!grant.scopes.some(s => s.includes('gmail.readonly') || s === 'https://mail.google.com/')) {
      log.warn('cannot reconcile a gmail send — scope is send-only by design', {
        grantId: grant.grantId, messageId: messageIdFor(idempotencyKey),
      })
      return null
    }

    const query = rfc822Query(messageIdFor(idempotencyKey))
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${grant.accessToken}` } },
    )
    if (!res.ok) return null
    const data = await res.json() as { resultSizeEstimate?: number }
    return (data.resultSizeEstimate ?? 0) > 0
  },

  async revoke(grant: ResolvedGrant): Promise<void> {
    // Called BEFORE the local grant is marked revoked, so a failure here leaves us holding a
    // grant we know about rather than an orphaned token we have lost the reference to.
    const res = await fetch(`${REVOKE_URL}?token=${encodeURIComponent(grant.accessToken)}`, {
      method: 'POST',
    })
    // Google returns 400 for an already-invalid token. That is the desired end state, so it is
    // not an error — the goal is "this token cannot send", not "we performed a revocation".
    if (!res.ok && res.status !== 400) {
      throw new Error(`gmail revoke failed with ${res.status}`)
    }
  },
}

/** @deprecated Kept so existing tests keep importing a name they already know. `messageIdFor`
 *  is now a real export; prefer it. */
export const __messageIdFor = messageIdFor
