/**
 * F13 — the PostHog OAuth handshake. The first connector whose OAuth model genuinely differs
 * from every other one built so far — see the plan's Context section for the three reasons
 * (CIMD instead of pre-registration, PKCE instead of a client secret, real token refresh).
 *
 * ⚠️ NO CLIENT SECRET TO SIGN STATE WITH — a gap the other four connectors never had. Every
 * other OAuth module signs its CSRF `state` token with ITS OWN provider client secret
 * (`GOOGLE_CONNECTOR_CLIENT_SECRET`, `SLACK_CONNECTOR_CLIENT_SECRET`, our own
 * `STRIPE_SECRET_KEY`). PostHog is a "public" client under CIMD — by definition it has no
 * secret. So this file introduces one small, dedicated secret, `POSTHOG_CONNECTOR_STATE_SECRET`,
 * used ONLY to sign our own CSRF token — it is never sent to PostHog and has nothing to do with
 * PostHog's own auth. Generate it ourselves (any random 32+ byte string); it doesn't require
 * anything from PostHog's side, unlike every other connector's credential.
 *
 * ⚠️ THE PKCE VERIFIER RIDES INSIDE THE SIGNED STATE. `oauth-state.ts`'s signed payload is a
 * single string; this file packs `${founderId}|${codeVerifier}` into that slot and splits it
 * back apart after verification. The verifier is deliberately generated as hex (not the full
 * PKCE charset) specifically because hex contains no `.` character — `oauth-state.ts`'s payload
 * splits on `.`, and a verifier containing one would corrupt the encoding. `oauth-state.ts`
 * itself is untouched; this is a local trick confined to this file.
 *
 * ⚠️ ENDPOINTS ARE DISCOVERED, NOT HARDCODED. PostHog's docs confirm a
 * `/.well-known/oauth-authorization-server` metadata endpoint exists but don't literally spell
 * out the `authorization_endpoint`/`token_endpoint` path strings — fetching and trusting that
 * document is the standard, spec-compliant way to consume it, safer than guessing a path.
 */

import { randomBytes, createHash } from 'crypto'
import { env } from '@/lib/env'
import { ConnectorError } from '../types'
import { signState, verifySignedState } from '../oauth-state'
import type { ExchangedTokens } from '../gmail/google-oauth'

const DISCOVERY_URL = 'https://oauth.posthog.com/.well-known/oauth-authorization-server'

interface DiscoveredEndpoints {
  authorizationEndpoint: string
  tokenEndpoint: string
  revocationEndpoint: string | null
}

// Process-lifetime cache — this is static server configuration, not per-founder data, so it's
// safe to hold across requests and re-fetch only if a cold start clears it.
let cached: DiscoveredEndpoints | null = null

async function discover(): Promise<DiscoveredEndpoints> {
  if (cached) return cached
  const res = await fetch(DISCOVERY_URL)
  if (!res.ok) {
    throw new ConnectorError('not_configured', 'Could not reach PostHog to start the connection.')
  }
  const data = await res.json() as {
    authorization_endpoint?: string; token_endpoint?: string; revocation_endpoint?: string
  }
  if (!data.authorization_endpoint || !data.token_endpoint) {
    throw new ConnectorError('not_configured', 'PostHog did not return the expected OAuth endpoints.')
  }
  cached = {
    authorizationEndpoint: data.authorization_endpoint,
    tokenEndpoint: data.token_endpoint,
    revocationEndpoint: data.revocation_endpoint ?? null,
  }
  return cached
}

/** Exposed for tests only — clears the discovery cache between test cases. */
export function __resetDiscoveryCache(): void {
  cached = null
}

function stateSecret(): string {
  const secret = process.env.POSTHOG_CONNECTOR_STATE_SECRET
  if (!secret) throw new ConnectorError('not_configured', 'The PostHog connector is not configured.')
  return secret
}

/** Our CIMD client id — a URL we host, not a value PostHog issues us. */
function clientId(): string {
  return `${env.appUrl}/.well-known/oauth-client-metadata.json`
}

function redirectUri(): string {
  return `${env.appUrl}/api/connectors/posthog/callback`
}

/** Hex, deliberately — see module docstring on why this must never contain a `.`. */
function generateCodeVerifier(): string {
  return randomBytes(32).toString('hex')
}

function codeChallengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function createState(founderId: string, codeVerifier: string): string {
  return signState(stateSecret(), `${founderId}|${codeVerifier}`)
}

export function verifyState(state: string): { founderId: string; codeVerifier: string } {
  const { founderId: packed } = verifySignedState(stateSecret(), state)
  const sep = packed.indexOf('|')
  if (sep === -1) throw new ConnectorError('bad_state', 'That connection link is not valid.')
  return { founderId: packed.slice(0, sep), codeVerifier: packed.slice(sep + 1) }
}

/** Where to send the founder to consent — includes the PKCE challenge, not the verifier. */
export async function authorizeUrl(founderId: string, scopes: readonly string[]): Promise<string> {
  const { authorizationEndpoint } = await discover()
  const verifier = generateCodeVerifier()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: scopes.join(' '),
    code_challenge: codeChallengeFor(verifier),
    code_challenge_method: 'S256',
    state: createState(founderId, verifier),
  })
  return `${authorizationEndpoint}?${params.toString()}`
}

/**
 * Trade the code for tokens using PKCE (the verifier recovered from `state`) instead of a client
 * secret — there is none, by design, for a CIMD/public client.
 */
export async function exchangeCode(code: string, required: readonly string[], state: string): Promise<ExchangedTokens> {
  const { tokenEndpoint } = await discover()
  const { codeVerifier } = verifyState(state)

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: clientId(),
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    throw new ConnectorError('exchange_failed', 'PostHog refused the connection. Try again.')
  }

  const data = await res.json() as {
    access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string
  }
  if (data.error) {
    throw new ConnectorError('exchange_failed', `PostHog refused the connection: ${data.error}.`)
  }
  if (!data.access_token || !data.refresh_token) {
    throw new ConnectorError('exchange_failed', 'PostHog returned an incomplete connection.')
  }

  const grantedScopes = (data.scope ?? '').split(' ').filter(Boolean)
  const missing = required.filter(s => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new ConnectorError('scope_declined', 'The required permission was not granted. Connect again and leave every permission ticked.')
  }

  return {
    refreshToken: data.refresh_token, // the real, long-lived phr_ token — see module docstring
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    grantedScopes,
    accountEmail: null, // no cheap "which account" lookup confirmed available — cosmetic only
  }
}

/** A REAL refresh — PostHog's access tokens are short-lived, unlike Slack's/Stripe's. */
export async function mintAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const { tokenEndpoint } = await discover()
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId(),
    }),
  })
  if (!res.ok) {
    throw new ConnectorError('refresh_failed', 'This connection needs reconnecting.')
  }
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new ConnectorError('refresh_failed', 'This connection needs reconnecting.')
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  }
}

/** The revocation endpoint, if PostHog's discovery document provided one — null if it didn't. */
export async function revocationEndpoint(): Promise<string | null> {
  return (await discover()).revocationEndpoint
}
