/**
 * F13 — the OAuth CSRF state token, shared across every connector's OAuth handshake.
 *
 * Extracted out of `oauth.ts` (originally Gmail-only) so a second OAuth-based provider doesn't
 * need to reimplement the same signing/verification logic. Isolation between providers comes
 * from each caller signing with its OWN secret (Gmail's Google client secret, Slack's Slack App
 * secret) — a state signed for one provider fails verification under another provider's secret,
 * with no need to encode a provider tag in the payload.
 *
 * See `oauth.ts` for why this exists at all: without it, an attacker can hand a founder a link
 * that connects the ATTACKER's account to the FOUNDER's workspace.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { ConnectorError } from './types'

/** A state older than this is refused. Long enough to consent, short enough to be useless later. */
const STATE_TTL_MS = 10 * 60 * 1000

/** A signed, time-limited, founder-bound state token, keyed by the caller's own secret. */
export function signState(secret: string, founderId: string): string {
  const payload = `${founderId}.${Date.now()}.${randomBytes(16).toString('hex')}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

/**
 * Verify a returned state and recover the founder it was minted for.
 *
 * @throws ConnectorError on a bad signature, a malformed token, or an expired one — every
 *         branch denies. This is the CSRF gate; there is no "probably fine" path through it.
 */
export function verifySignedState(secret: string, state: string): { founderId: string } {
  let decoded: string
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8')
  } catch {
    throw new ConnectorError('bad_state', 'That connection link is not valid.')
  }

  const parts = decoded.split('.')
  if (parts.length !== 4) throw new ConnectorError('bad_state', 'That connection link is not valid.')
  const [founderId, issuedAt, nonce, sig] = parts

  const expected = createHmac('sha256', secret)
    .update(`${founderId}.${issuedAt}.${nonce}`)
    .digest('hex')

  // Constant-time compare: a fast-exit comparison leaks how much of a forged signature is right.
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ConnectorError('bad_state', 'That connection link is not valid.')
  }

  if (Date.now() - Number(issuedAt) > STATE_TTL_MS) {
    throw new ConnectorError('expired_state', 'That connection link expired. Start again.')
  }
  return { founderId }
}
