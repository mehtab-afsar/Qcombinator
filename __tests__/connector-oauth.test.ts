/**
 * F13 — the OAuth state token: the CSRF gate on the connect flow.
 *
 * WHY THIS IS THE MOST DANGEROUS FUNCTION IN THE CONNECTOR LAYER: the callback takes the founder
 * id from INSIDE the signed state. Get this wrong and an attacker hands a founder a crafted link
 * that attaches the ATTACKER's Google account to the FOUNDER's workspace — the founder's Programs
 * then send mail through an inbox they do not control, and every audit row looks normal.
 *
 * So: forged, tampered, replayed-late and cross-founder states all have a test.
 */

process.env.GOOGLE_CONNECTOR_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
process.env.GOOGLE_CONNECTOR_CLIENT_SECRET = 'test-secret'

import { createState, verifyState, authorizeUrl, redirectUri } from '@/lib/connectors/oauth'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const FOUNDER = 'f1-abc'

describe('state — the CSRF gate', () => {
  it('round-trips the founder it was minted for', () => {
    expect(verifyState(createState(FOUNDER))).toEqual({ founderId: FOUNDER })
  })

  it('two states for the same founder differ — no replayable constant', () => {
    expect(createState(FOUNDER)).not.toBe(createState(FOUNDER))
  })

  it('REJECTS a forged state', () => {
    // The attack: craft a state naming the victim, hand them the link.
    const forged = Buffer.from(`${FOUNDER}.${Date.now()}.nonce.deadbeef`).toString('base64url')
    expect(() => verifyState(forged)).toThrow(ConnectorError)
  })

  it('REJECTS a state whose founder id was swapped after signing', () => {
    // The signature covers the founder id, so re-pointing a valid state at someone else fails.
    const decoded = Buffer.from(createState(FOUNDER), 'base64url').toString('utf8')
    const [, issuedAt, nonce, sig] = decoded.split('.')
    const swapped = Buffer.from(`victim-id.${issuedAt}.${nonce}.${sig}`).toString('base64url')
    expect(() => verifyState(swapped)).toThrow(ConnectorError)
  })

  it('REJECTS a state signed with a different secret', () => {
    const good = createState(FOUNDER)
    process.env.GOOGLE_CONNECTOR_CLIENT_SECRET = 'a-different-secret'
    expect(() => verifyState(good)).toThrow(ConnectorError)
    process.env.GOOGLE_CONNECTOR_CLIENT_SECRET = 'test-secret'
  })

  it('REJECTS an expired state', () => {
    const stale = Date.now() - 11 * 60 * 1000 // TTL is 10 minutes
    const decoded = Buffer.from(createState(FOUNDER), 'base64url').toString('utf8')
    const [founderId, , nonce] = decoded.split('.')
    // Re-sign honestly at the old timestamp — proving expiry is checked independently of the
    // signature, not merely implied by it.
    const { createHmac } = require('crypto') as typeof import('crypto')
    const payload = `${founderId}.${stale}.${nonce}`
    const sig = createHmac('sha256', 'test-secret').update(payload).digest('hex')
    expect(() => verifyState(Buffer.from(`${payload}.${sig}`).toString('base64url')))
      .toThrow(/expired/i)
  })

  it('REJECTS malformed input rather than crashing', () => {
    for (const bad of ['', 'not-base64!!', Buffer.from('a.b').toString('base64url'), 'x']) {
      expect(() => verifyState(bad)).toThrow(ConnectorError)
    }
  })
})

describe('the authorize URL', () => {
  const url = () => new URL(authorizeUrl(FOUNDER, getConnector('gmail').scopes))

  it('requests gmail.send ONLY — it cannot read the mailbox', () => {
    expect(url().searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.send')
  })

  it('asks for a durable credential — offline + consent', () => {
    // Without prompt=consent, Google omits the refresh token on a re-connect and we would store
    // an access token that dies in an hour with no way to renew it.
    expect(url().searchParams.get('access_type')).toBe('offline')
    expect(url().searchParams.get('prompt')).toBe('consent')
  })

  it('does NOT silently inherit scopes from another grant', () => {
    expect(url().searchParams.get('include_granted_scopes')).toBe('false')
  })

  it('carries a verifiable state and the registered redirect', () => {
    expect(verifyState(url().searchParams.get('state')!)).toEqual({ founderId: FOUNDER })
    expect(url().searchParams.get('redirect_uri')).toBe(redirectUri())
  })

  it('the redirect URI is the one that must be registered on the Google client', () => {
    expect(redirectUri()).toMatch(/\/api\/connectors\/gmail\/callback$/)
  })
})
