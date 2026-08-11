/**
 * F13 — the Gmail-read OAuth state token, mirroring connector-oauth.test.ts's coverage for the
 * send connector, plus one test for the documented, deliberately-accepted edge case: this
 * connector shares its client secret with the send connector's (`oauth.ts`) — see
 * gmail-read-oauth.ts's docstring for why that's safe (Google's own redirect_uri matching is the
 * real boundary between the two flows).
 */

process.env.GOOGLE_CONNECTOR_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com'
process.env.GOOGLE_CONNECTOR_CLIENT_SECRET = 'test-google-secret'

import { createHmac } from 'crypto'
import { createState, verifyState, authorizeUrl, redirectUri } from '@/lib/connectors/gmail/read-oauth'
import { createState as createSendState, redirectUri as sendRedirectUri } from '@/lib/connectors/gmail/send-oauth'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const FOUNDER = 'f1-abc'

describe('gmail_read state — the CSRF gate', () => {
  it('round-trips the founder it was minted for', () => {
    expect(verifyState(createState(FOUNDER))).toEqual({ founderId: FOUNDER })
  })

  it('REJECTS a forged state', () => {
    const forged = Buffer.from(`${FOUNDER}.${Date.now()}.nonce.deadbeef`).toString('base64url')
    expect(() => verifyState(forged)).toThrow(ConnectorError)
  })

  it('REJECTS an expired state', () => {
    const stale = Date.now() - 11 * 60 * 1000 // TTL is 10 minutes
    const decoded = Buffer.from(createState(FOUNDER), 'base64url').toString('utf8')
    const [founderId, , nonce] = decoded.split('.')
    const payload = `${founderId}.${stale}.${nonce}`
    const sig = createHmac('sha256', 'test-google-secret').update(payload).digest('hex')
    expect(() => verifyState(Buffer.from(`${payload}.${sig}`).toString('base64url')))
      .toThrow(/expired/i)
  })

  it('DOCUMENTS the accepted same-secret overlap with the send connector\'s state', () => {
    // Deliberate, not a bug: gmail-read-oauth.ts shares GOOGLE_CONNECTOR_CLIENT_SECRET with
    // oauth.ts, so a state minted by either verifies under the other's signature. If this ever
    // starts throwing, the two have drifted apart (e.g. a secret rotation only applied to one),
    // which is worth knowing, not silently passing.
    expect(() => verifyState(createSendState(FOUNDER))).not.toThrow()
  })
})

describe('the gmail_read authorize URL', () => {
  const url = () => new URL(authorizeUrl(FOUNDER, getConnector('gmail_read').scopes))

  it('requests readonly + compose — never send', () => {
    const scope = url().searchParams.get('scope')
    expect(scope).toContain('gmail.readonly')
    expect(scope).toContain('gmail.compose')
    expect(scope).not.toContain('gmail.send')
  })

  it('carries a verifiable state and its OWN redirect — distinct from the send connector\'s', () => {
    expect(verifyState(url().searchParams.get('state')!)).toEqual({ founderId: FOUNDER })
    expect(url().searchParams.get('redirect_uri')).toBe(redirectUri())
    expect(redirectUri()).not.toBe(sendRedirectUri())
  })

  it('the redirect URI is a SECOND one that must be registered on the Google client', () => {
    expect(redirectUri()).toMatch(/\/api\/connectors\/gmail_read\/callback$/)
  })
})
