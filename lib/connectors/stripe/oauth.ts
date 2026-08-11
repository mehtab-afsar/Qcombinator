/**
 * F13 — the Stripe Connect OAuth handshake for the Stripe (revenue verification) connector.
 *
 * ⚠️ STRIPE'S AUTH MODEL DIFFERS FROM GOOGLE'S/SLACK'S, ON PURPOSE, NOT BY MISTAKE. Google and
 * Slack both use a `client_id` + a separate `client_secret`. Stripe Connect does not have a
 * "client secret" — per Stripe's own docs, the token exchange is authenticated with OUR
 * PLATFORM'S OWN STRIPE SECRET KEY (`STRIPE_SECRET_KEY`, the same one already used elsewhere in
 * this app for our own billing) via HTTP Basic auth, username-only. `STRIPE_CONNECT_CLIENT_ID`
 * is real and distinct (from Connect settings); there is no `STRIPE_CONNECT_CLIENT_SECRET`.
 *
 * ⚠️ `read_only` SCOPE REQUIRES STRIPE'S OWN APPROVAL. Confirmed via Stripe's docs: a new
 * platform requesting `read_only` must contact Stripe support — this is not self-serve, and
 * nothing in this file can make it self-serve. The OAuth flow itself works the moment that
 * approval and the Connect client are in place; until then `authorizeUrl` produces a working
 * link, but Stripe's own consent screen may refuse the scope.
 *
 * ⚠️ NO `redirect_uri` PARAMETER, ON PURPOSE. Unlike Google, Stripe's authorize/token endpoints
 * don't require a redirect_uri round-trip — Stripe redirects to whichever URL is configured as
 * the default in Connect settings. Our callback still lives at the same generic
 * `/api/connectors/stripe/callback` path as every other provider's; it's just registered in
 * Stripe's dashboard rather than passed in this code.
 *
 * ⚠️ ASSUMED: Stripe Connect access tokens for Standard accounts do not expire under normal use
 * (no Google-style short-lived-access/long-lived-refresh split) — `mintAccessToken` is a
 * pass-through, same treatment as Slack's bot token. Verify this empirically once a real
 * connection exists; if Stripe tokens turn out to expire, this is the only function that needs
 * to change.
 *
 * Returns the shared `ExchangedTokens` shape (`./oauth.ts`) like every other OAuth module, so it
 * plugs into the generic `oauth-provider.ts` dispatch and the generic `[provider]/callback` route
 * with no changes to either — the "which account" field (`accountEmail`) carries Stripe's
 * connected account id (`acct_...`) here, the same reuse `gmail-read-oauth.ts` does for a
 * workspace name.
 */

import { ConnectorError } from '../types'
import { signState, verifySignedState } from '../oauth-state'
import type { ExchangedTokens } from '../gmail/google-oauth'

const AUTHORIZE_URL = 'https://connect.stripe.com/oauth/authorize'
const TOKEN_URL = 'https://connect.stripe.com/oauth/token'

function clientId(): string {
  const id = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!id) throw new ConnectorError('not_configured', 'The Stripe connector is not configured.')
  return id
}

/** Our own platform secret key — also used elsewhere in this app for our own billing. */
function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new ConnectorError('not_configured', 'The Stripe connector is not configured.')
  return key
}

export function createState(founderId: string): string {
  return signState(secretKey(), founderId)
}

export function verifyState(state: string): { founderId: string } {
  return verifySignedState(secretKey(), state)
}

/** Where to send the founder to authorize read-only access to their own Stripe account. */
export function authorizeUrl(founderId: string, scopes: readonly string[]): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    // Stripe Connect has exactly one scope per connection, not a space-joined list — least
    // privilege here means requesting read_only, never read_write.
    scope: scopes[0] ?? 'read_only',
    state: createState(founderId),
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Trade the authorization code for an access token and the connected account's id.
 *
 * ⚠️ Authenticated with OUR secret key via HTTP Basic auth (username, blank password) — this is
 * Stripe's documented mechanism, not a workaround. Never logs or echoes the code or the key.
 */
export async function exchangeCode(code: string, required: readonly string[]): Promise<ExchangedTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString('base64')}`,
    },
    body: new URLSearchParams({ code, grant_type: 'authorization_code' }),
  })

  if (!res.ok) {
    throw new ConnectorError('exchange_failed', 'Stripe refused the connection. Try again.')
  }

  const data = await res.json() as {
    access_token?: string; stripe_user_id?: string; scope?: string; error?: string
  }

  if (data.error) {
    throw new ConnectorError('exchange_failed', `Stripe refused the connection: ${data.error}.`)
  }
  if (!data.access_token || !data.stripe_user_id) {
    throw new ConnectorError('exchange_failed', 'Stripe returned an incomplete connection.')
  }

  const grantedScopes = data.scope ? [data.scope] : []
  const missing = required.filter(s => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new ConnectorError(
      'scope_declined',
      'Read-only permission was not granted. Connect again and leave it ticked.',
    )
  }

  return {
    refreshToken: data.access_token, // the durable credential — see module docstring
    accessToken: data.access_token,
    expiresAt: null, // does not expire under normal use — see module docstring
    grantedScopes,
    accountEmail: data.stripe_user_id, // "which account" — Stripe's connected account id
  }
}

/** Stripe Connect access tokens don't expire under normal use — return the stored token unchanged. */
export async function mintAccessToken(
  storedToken: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  return { accessToken: storedToken, expiresAt: null }
}
