/**
 * F14 — the payload hash, and what may be written to `action_log`.
 *
 * Two jobs, both load-bearing for the approval gate:
 *
 *  1. **Canonical hashing.** An approval binds to a payload HASH, not to a row id
 *     (F13_F14_DESIGN.md §7). Execution recomputes the hash and refuses on mismatch, so an
 *     approval cannot be replayed against a payload the founder never saw. That only works if
 *     the same payload always hashes the same — hence canonicalisation, not `JSON.stringify`.
 *
 *  2. **Redaction.** `action_log.request` records METADATA, never content: recipient count and
 *     domain, subject length, ids. Never a body, never an address (CLAUDE.md §3 — no PII in
 *     logs). The hash is what preserves the audit's meaning without retaining what was sent.
 *
 * Pure. No IO, no database.
 */

import { createHash } from 'crypto'

/** A prepared Action payload, before it reaches a Connector. */
export interface ActionPayload {
  recipients?: ReadonlyArray<{ email: string; name?: string }>
  subject?: string
  body?: string
  /** A provider-specific destination for connectors that aren't recipient-shaped (Slack: a channel id). */
  channel?: string
  [key: string]: unknown
}

/** What is safe to persist about a payload. Deliberately narrow — see the module docstring. */
export interface PayloadMetadata {
  recipientCount: number
  /** Domains only, deduped and sorted. 'acme.com', never 'jane@acme.com'. */
  recipientDomains: string[]
  subjectLength: number
  bodyLength: number
  /** A Slack channel id is "which mailbox", not PII the way an email address is — logged verbatim. */
  channel?: string
}

/**
 * Stable JSON: object keys sorted at every depth, so two payloads that differ only in key order
 * hash identically. `JSON.stringify` preserves insertion order, which would make an approval
 * spuriously invalid after a harmless refactor of the object literal that built it.
 */
function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((out, key) => {
        out[key] = canonicalise((value as Record<string, unknown>)[key])
        return out
      }, {})
  }
  return value
}

/**
 * The hash an approval binds to.
 *
 * ⚠️ Changing this function invalidates every outstanding approval, because previously-approved
 * payloads will no longer hash to their recorded value and execution will refuse them. That is
 * the correct failure direction — refusing to send is safe, sending unapproved is not — but it
 * means this is not a function to "tidy" casually.
 */
export function hashPayload(payload: ActionPayload): string {
  return createHash('sha256').update(JSON.stringify(canonicalise(payload))).digest('hex')
}

/** The domain half of an address, lowercased. Null when it isn't parseable as one. */
function domainOf(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

/**
 * Reduce a payload to what may be logged.
 *
 * Domains, not addresses: "we emailed 3 people at acme.com" is what an audit needs to answer,
 * and it is answerable without holding anyone's address. If a future question genuinely needs
 * the address, it should be asked of the provider — not of a log we chose to fill with PII.
 */
export function payloadMetadata(payload: ActionPayload): PayloadMetadata {
  const recipients = payload.recipients ?? []
  const domains = [...new Set(recipients.map(r => domainOf(r.email)).filter((d): d is string => d !== null))]
  return {
    recipientCount: recipients.length,
    recipientDomains: domains.sort(),
    subjectLength: payload.subject?.length ?? 0,
    bodyLength: payload.body?.length ?? 0,
    ...(payload.channel ? { channel: payload.channel } : {}),
  }
}
