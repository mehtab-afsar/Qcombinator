/**
 * Apollo's credential adapter — a pass-through, because Apollo authenticates with a plain API
 * key, not OAuth. The FIRST non-OAuth provider in the connector layer.
 *
 * ⚠️ WHY THIS FILE EXISTS AT ALL, given there is no handshake to perform. `resolveGrant`
 * (lib/connectors/grants.ts) calls `getOAuthProvider(provider).mintAccessToken()`
 * UNCONDITIONALLY on every use of every grant. A provider missing from `OAUTH_PROVIDERS` throws
 * `unknown_provider`, and that throw lands in resolveGrant's catch — which treats any failure
 * there as "the provider refused the refresh" and marks the founder's grant **expired**. Without
 * this file, connecting Apollo would appear to succeed and then silently kill itself on first
 * use. This is not ceremony; it is the fix for a real landmine.
 *
 * The pass-through shape has precedent: Slack's and Stripe's `mintAccessToken` do the same thing
 * for the same reason — their credentials don't expire either, so "mint an access token from the
 * durable credential" is the identity function.
 *
 * The three OAuth members throw rather than returning something plausible. Apollo grants are
 * created through `POST /api/connectors/apollo/key`, never the generic OAuth routes, so reaching
 * these is a wiring bug — and a loud failure is the point (same posture as `getConnector`'s
 * unknown-provider throw).
 */

import { ConnectorError } from '../types'
import type { ExchangedTokens } from '../gmail/google-oauth'

const NO_HANDSHAKE = 'Apollo authenticates with an API key — connect it via POST /api/connectors/apollo/key, not the OAuth routes.'

export async function authorizeUrl(): Promise<string> {
  throw new ConnectorError('not_configured', NO_HANDSHAKE)
}

export function verifyState(): { founderId: string } {
  throw new ConnectorError('not_configured', NO_HANDSHAKE)
}

export async function exchangeCode(): Promise<ExchangedTokens> {
  throw new ConnectorError('not_configured', NO_HANDSHAKE)
}

/**
 * The identity function, deliberately. An Apollo API key IS the live credential — there is
 * nothing to exchange it for, and it does not expire on a schedule Apollo publishes.
 *
 * `expiresAt: null` tells `resolveGrant` never to treat this grant as stale.
 */
export async function mintAccessToken(
  storedCredential: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  return { accessToken: storedCredential, expiresAt: null }
}
