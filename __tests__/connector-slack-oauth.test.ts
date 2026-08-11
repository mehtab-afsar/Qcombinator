/**
 * F13 — the Slack OAuth state token, mirroring connector-oauth.test.ts's Gmail coverage.
 *
 * Slack shares the CSRF state machinery with Gmail (`lib/connectors/oauth-state.ts`) but signs
 * with its OWN secret — a state minted for one provider must fail verification under the other's
 * secret, with no need for a provider tag in the payload (see oauth-state.ts's docstring).
 */

process.env.SLACK_CONNECTOR_CLIENT_ID = 'test-slack-client-id'
process.env.SLACK_CONNECTOR_CLIENT_SECRET = 'test-slack-secret'
process.env.GOOGLE_CONNECTOR_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com'
process.env.GOOGLE_CONNECTOR_CLIENT_SECRET = 'test-google-secret'

import { createHmac } from 'crypto'
import { createState, verifyState, authorizeUrl, redirectUri } from '@/lib/connectors/slack/oauth'
import { createState as createGoogleState } from '@/lib/connectors/gmail/send-oauth'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const FOUNDER = 'f1-abc'

describe('Slack state — the CSRF gate', () => {
  it('round-trips the founder it was minted for', () => {
    expect(verifyState(createState(FOUNDER))).toEqual({ founderId: FOUNDER })
  })

  it('two states for the same founder differ — no replayable constant', () => {
    expect(createState(FOUNDER)).not.toBe(createState(FOUNDER))
  })

  it('REJECTS a forged state', () => {
    const forged = Buffer.from(`${FOUNDER}.${Date.now()}.nonce.deadbeef`).toString('base64url')
    expect(() => verifyState(forged)).toThrow(ConnectorError)
  })

  it('REJECTS a state minted for Gmail — different secret, same shared machinery', () => {
    // The isolation property oauth-state.ts's docstring promises: no provider tag needed in the
    // payload, because a different secret alone is enough to fail verification.
    const googleState = createGoogleState(FOUNDER)
    expect(() => verifyState(googleState)).toThrow(ConnectorError)
  })

  it('REJECTS an expired state', () => {
    const stale = Date.now() - 11 * 60 * 1000 // TTL is 10 minutes
    const decoded = Buffer.from(createState(FOUNDER), 'base64url').toString('utf8')
    const [founderId, , nonce] = decoded.split('.')
    const payload = `${founderId}.${stale}.${nonce}`
    const sig = createHmac('sha256', 'test-slack-secret').update(payload).digest('hex')
    expect(() => verifyState(Buffer.from(`${payload}.${sig}`).toString('base64url')))
      .toThrow(/expired/i)
  })

  it('REJECTS malformed input rather than crashing', () => {
    for (const bad of ['', 'not-base64!!', Buffer.from('a.b').toString('base64url'), 'x']) {
      expect(() => verifyState(bad)).toThrow(ConnectorError)
    }
  })
})

describe('the Slack authorize URL', () => {
  const url = () => new URL(authorizeUrl(FOUNDER, getConnector('slack').scopes))

  it('requests chat:write ONLY — it cannot read the workspace', () => {
    expect(url().searchParams.get('scope')).toBe('chat:write')
  })

  it('carries a verifiable state and the registered redirect', () => {
    expect(verifyState(url().searchParams.get('state')!)).toEqual({ founderId: FOUNDER })
    expect(url().searchParams.get('redirect_uri')).toBe(redirectUri())
  })

  it('the redirect URI is the one that must be registered on the Slack App', () => {
    expect(redirectUri()).toMatch(/\/api\/connectors\/slack\/callback$/)
  })
})
