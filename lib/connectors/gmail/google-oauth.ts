/**
 * F13 — the Google OAuth 2.0 mechanics shared by every connector under our one Google OAuth
 * client (Gmail send today, Gmail-read as of this file, any future Google connector).
 *
 * Extracted once a SECOND Google connector (Gmail-read) needed the exact same code-exchange and
 * token-refresh logic as the first (`oauth.ts`, Gmail send) — the same trigger as
 * `lib/connectors/mcp/client.ts`: duplicating something a second time is the signal it was
 * genuinely shared, not a first guess at what might be.
 *
 * What stays OUT of this file, deliberately, because it's each connector's own: its redirect URI,
 * which scopes it asks for, and its own `createState`/`verifyState` wrapper. All of them are
 * signed with the ONE shared client secret (`clientSecret()` below) — safe not because the state
 * signature differs per connector (it doesn't; see `gmail-read-oauth.ts`'s docstring for why that's
 * fine) but because Google's own strict `redirect_uri` matching on the token exchange is the real
 * boundary between one connector's flow and another's.
 */

import { ConnectorError } from '../types'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export function clientId(): string {
  const id = process.env.GOOGLE_CONNECTOR_CLIENT_ID
  if (!id) throw new ConnectorError('not_configured', 'This Google connector is not configured.')
  return id
}

export function clientSecret(): string {
  const secret = process.env.GOOGLE_CONNECTOR_CLIENT_SECRET
  if (!secret) throw new ConnectorError('not_configured', 'This Google connector is not configured.')
  return secret
}

/** Where to send the founder to consent. `state` and `redirectUri` are the caller's own. */
export function buildAuthorizeUrl(args: { redirectUri: string; scopes: readonly string[]; state: string }): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: args.redirectUri,
    response_type: 'code',
    scope: args.scopes.join(' '),
    // offline + consent guarantees a refresh token. Without `prompt=consent`, Google omits it on
    // a re-connect, and we would store an access token that dies in an hour with no way to renew.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false', // never silently inherit scopes from another grant
    state: args.state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface ExchangedTokens {
  refreshToken: string
  accessToken: string
  /** Null for providers whose durable credential does not expire. */
  expiresAt: string | null
  grantedScopes: string[]
  accountEmail: string | null
}

/**
 * Trade an authorization code for tokens.
 *
 * ⚠️ Verifies the GRANTED scopes rather than trusting what was asked for. A founder can untick
 * permissions on Google's consent screen, and a connection that silently lacks its intended scope
 * would fail later, confusingly, at the moment it mattered.
 */
export async function exchangeGoogleCode(args: {
  code: string
  redirectUri: string
  requiredScopes: readonly string[]
  scopeDeniedMessage: string
}): Promise<ExchangedTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: args.code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: args.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    // Google echoes the request in its error body; never surface or log that.
    throw new ConnectorError('exchange_failed', 'Google refused the connection. Try again.')
  }

  const data = await res.json() as {
    refresh_token?: string; access_token?: string; expires_in?: number; scope?: string
  }

  if (!data.refresh_token) {
    // Happens when the account was previously connected and consent was not re-prompted. We ask
    // for prompt=consent precisely to avoid it, so this means something is off — fail rather
    // than store an access token that expires in an hour and cannot be renewed.
    throw new ConnectorError(
      'no_refresh_token',
      'Google did not return a durable credential. Remove this app at myaccount.google.com and connect again.',
    )
  }
  if (!data.access_token) throw new ConnectorError('exchange_failed', 'Google returned no access token.')

  const grantedScopes = (data.scope ?? '').split(' ').filter(Boolean)
  const missing = args.requiredScopes.filter(s => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new ConnectorError('scope_declined', args.scopeDeniedMessage)
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    grantedScopes,
    accountEmail: await fetchAccountEmail(data.access_token),
  }
}

/**
 * Which account was connected, so the founder can tell one grant from another.
 * Best-effort: a null email is cosmetic, and must never block a working connection.
 */
async function fetchAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) return null
    return ((await res.json()) as { email?: string }).email ?? null
  } catch {
    return null
  }
}

/** Exchange a stored refresh token for a fresh access token. */
export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    // The founder revoked us at Google, or the token was expired by inactivity. Fail closed —
    // the caller marks the grant expired and asks for a reconnect.
    throw new ConnectorError('refresh_failed', 'This connection needs reconnecting.')
  }
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new ConnectorError('refresh_failed', 'This connection needs reconnecting.')

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  }
}
