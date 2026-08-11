/**
 * F13 — the PostHog OAuth flow: PKCE + discovery + the CSRF state that carries the code
 * verifier. The first connector needing any of these, so this test file covers ground none of
 * the other four's oauth tests do.
 */

process.env.POSTHOG_CONNECTOR_STATE_SECRET = 'test-posthog-state-secret'

import { createHash, createHmac } from 'crypto'
import {
  createState, verifyState, authorizeUrl, __resetDiscoveryCache,
} from '@/lib/connectors/posthog/oauth'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const FOUNDER = 'f1-abc'
const DISCOVERY_URL = 'https://oauth.posthog.com/.well-known/oauth-authorization-server'
const MOCK_ENDPOINTS = {
  authorization_endpoint: 'https://oauth.posthog.com/oauth/authorize',
  token_endpoint: 'https://oauth.posthog.com/oauth/token',
  revocation_endpoint: 'https://oauth.posthog.com/oauth/revoke',
}

const originalFetch = global.fetch

beforeEach(() => {
  __resetDiscoveryCache()
  global.fetch = jest.fn(async (url: unknown) => {
    if (url === DISCOVERY_URL) {
      return { ok: true, json: async () => MOCK_ENDPOINTS } as Response
    }
    throw new Error(`unexpected fetch in test: ${url}`)
  }) as unknown as typeof fetch
})

afterEach(() => { global.fetch = originalFetch })

describe('PostHog state — carries the PKCE verifier, not just the founder id', () => {
  it('round-trips both the founder id and the verifier it was minted with', () => {
    const state = createState(FOUNDER, 'a-verifier-in-hex-abc123')
    expect(verifyState(state)).toEqual({ founderId: FOUNDER, codeVerifier: 'a-verifier-in-hex-abc123' })
  })

  it('REJECTS a forged state', () => {
    const forged = Buffer.from(`${FOUNDER}|verifier.${Date.now()}.nonce.deadbeef`).toString('base64url')
    expect(() => verifyState(forged)).toThrow(ConnectorError)
  })

  it('REJECTS a state with no packed verifier at all (malformed payload)', () => {
    // Sign a state the way oauth-state.ts would for a plain founderId with no '|' separator —
    // this connector's verifyState must reject it rather than silently returning an empty verifier.
    const payload = `${FOUNDER}.${Date.now()}.nonce`
    const sig = createHmac('sha256', 'test-posthog-state-secret').update(payload).digest('hex')
    const noSeparator = Buffer.from(`${payload}.${sig}`).toString('base64url')
    expect(() => verifyState(noSeparator)).toThrow(ConnectorError)
  })

  it('REJECTS an expired state', () => {
    const stale = Date.now() - 11 * 60 * 1000
    const decoded = Buffer.from(createState(FOUNDER, 'verifier123'), 'base64url').toString('utf8')
    const [packed, , nonce] = decoded.split('.')
    const payload = `${packed}.${stale}.${nonce}`
    const sig = createHmac('sha256', 'test-posthog-state-secret').update(payload).digest('hex')
    expect(() => verifyState(Buffer.from(`${payload}.${sig}`).toString('base64url')))
      .toThrow(/expired/i)
  })
})

describe('PostHog authorize URL — PKCE challenge matches a verifier recoverable from state', () => {
  it('the code_challenge in the URL is the SHA256/base64url of the verifier packed into state', async () => {
    const url = new URL(await authorizeUrl(FOUNDER, getConnector('posthog').scopes))
    const { codeVerifier } = verifyState(url.searchParams.get('state')!)
    const expectedChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    expect(url.searchParams.get('code_challenge')).toBe(expectedChallenge)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('the verifier contains no "." — it must survive oauth-state.ts\'s dot-delimited encoding', async () => {
    const url = new URL(await authorizeUrl(FOUNDER, getConnector('posthog').scopes))
    const { codeVerifier } = verifyState(url.searchParams.get('state')!)
    expect(codeVerifier).not.toContain('.')
    expect(codeVerifier).toMatch(/^[0-9a-f]+$/) // hex, deliberately
  })

  it('requests only read-only scopes, space-separated', async () => {
    const url = new URL(await authorizeUrl(FOUNDER, getConnector('posthog').scopes))
    expect(url.searchParams.get('scope')).toBe('insight:read dashboard:read query:read')
  })

  it('client_id is a URL we host, not a value PostHog issued us', async () => {
    const url = new URL(await authorizeUrl(FOUNDER, getConnector('posthog').scopes))
    expect(url.searchParams.get('client_id')).toMatch(/\/\.well-known\/oauth-client-metadata\.json$/)
  })

  it('uses the DISCOVERED authorization endpoint, not a hardcoded guess', async () => {
    const url = await authorizeUrl(FOUNDER, getConnector('posthog').scopes)
    expect(url.startsWith(MOCK_ENDPOINTS.authorization_endpoint)).toBe(true)
  })
})
