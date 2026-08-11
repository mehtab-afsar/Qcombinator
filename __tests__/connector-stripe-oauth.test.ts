/**
 * F13 — the Stripe Connect OAuth state token, mirroring connector-slack-oauth.test.ts's shape.
 *
 * Stripe's CSRF state is signed with our own platform secret key (`STRIPE_SECRET_KEY`) rather
 * than a separate "client secret" — see stripe-oauth.ts's docstring for why Stripe's auth model
 * genuinely differs from Google's/Slack's, not by oversight.
 */

process.env.STRIPE_CONNECT_CLIENT_ID = 'ca_test_client_id'
process.env.STRIPE_SECRET_KEY = 'sk_test_stripesecret'

import { createHmac } from 'crypto'
import { createState, verifyState, authorizeUrl } from '@/lib/connectors/stripe/oauth'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const FOUNDER = 'f1-abc'

describe('Stripe state — the CSRF gate', () => {
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

  it('REJECTS a state signed with a different secret', () => {
    const good = createState(FOUNDER)
    process.env.STRIPE_SECRET_KEY = 'sk_test_adifferentsecret'
    expect(() => verifyState(good)).toThrow(ConnectorError)
    process.env.STRIPE_SECRET_KEY = 'sk_test_stripesecret'
  })

  it('REJECTS an expired state', () => {
    const stale = Date.now() - 11 * 60 * 1000 // TTL is 10 minutes
    const decoded = Buffer.from(createState(FOUNDER), 'base64url').toString('utf8')
    const [founderId, , nonce] = decoded.split('.')
    const payload = `${founderId}.${stale}.${nonce}`
    const sig = createHmac('sha256', 'sk_test_stripesecret').update(payload).digest('hex')
    expect(() => verifyState(Buffer.from(`${payload}.${sig}`).toString('base64url')))
      .toThrow(/expired/i)
  })

  it('REJECTS malformed input rather than crashing', () => {
    for (const bad of ['', 'not-base64!!', Buffer.from('a.b').toString('base64url'), 'x']) {
      expect(() => verifyState(bad)).toThrow(ConnectorError)
    }
  })
})

describe('the Stripe authorize URL', () => {
  const url = () => new URL(authorizeUrl(FOUNDER, getConnector('stripe').scopes))

  it('requests read_only ONLY — never read_write', () => {
    expect(url().searchParams.get('scope')).toBe('read_only')
  })

  it('carries a verifiable state', () => {
    expect(verifyState(url().searchParams.get('state')!)).toEqual({ founderId: FOUNDER })
  })

  it('sends response_type=code and our client_id', () => {
    expect(url().searchParams.get('response_type')).toBe('code')
    expect(url().searchParams.get('client_id')).toBe('ca_test_client_id')
  })

  it('carries NO redirect_uri — Stripe uses the Connect-settings default, deliberately, unlike Google', () => {
    expect(url().searchParams.has('redirect_uri')).toBe(false)
  })

  it('points at Stripe Connect, not a Google or Slack endpoint', () => {
    expect(url().origin + url().pathname).toBe('https://connect.stripe.com/oauth/authorize')
  })
})
