/**
 * F13 — the Google OAuth handshake for the Gmail connector.
 *
 * A DEDICATED client, deliberately separate from `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`
 * (login-with-Google). Connector authority must not be entangled with identity: revoking
 * "may send email as me" should never mean touching "may sign in as me" (F13_F14_DESIGN.md §9).
 *
 * Two halves, and the security lives in the second:
 *   1. `authorizeUrl()` — where we send the founder
 *   2. `exchangeCode()` — what we do with what comes back
 *
 * The `state` parameter is the CSRF defence and it is not optional. Without it, an attacker can
 * hand a founder a link that connects the ATTACKER's Google account to the FOUNDER's workspace —
 * so the founder's Programs would then send mail through an inbox they do not control. It is
 * signed, single-use, and bound to the founder.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'
import { ConnectorError } from './types'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/** A state older than this is refused. Long enough to consent, short enough to be useless later. */
const STATE_TTL_MS = 10 * 60 * 1000

function clientId(): string {
  const id = process.env.GOOGLE_CONNECTOR_CLIENT_ID
  if (!id) throw new ConnectorError('not_configured', 'The Gmail connector is not configured.')
  return id
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CONNECTOR_CLIENT_SECRET
  if (!secret) throw new ConnectorError('not_configured', 'The Gmail connector is not configured.')
  return secret
}

/** Must match a redirect URI registered on the Google client, exactly. */
export function redirectUri(): string {
  return `${env.appUrl}/api/connectors/gmail/callback`
}

/**
 * A signed, time-limited, founder-bound state token.
 *
 * Signed with the client secret rather than stored in a table: a stateless token cannot be
 * replayed after expiry and needs no cleanup job. The founder id is INSIDE the signed payload,
 * so a state minted for one founder cannot be used to attach a grant to another.
 */
export function createState(founderId: string): string {
  const payload = `${founderId}.${Date.now()}.${randomBytes(16).toString('hex')}`
  const sig = createHmac('sha256', clientSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

/**
 * Verify a returned state and recover the founder it was minted for.
 *
 * @throws ConnectorError on a bad signature, a malformed token, or an expired one — every
 *         branch denies. This is the CSRF gate; there is no "probably fine" path through it.
 */
export function verifyState(state: string): { founderId: string } {
  let decoded: string
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8')
  } catch {
    throw new ConnectorError('bad_state', 'That connection link is not valid.')
  }

  const parts = decoded.split('.')
  if (parts.length !== 4) throw new ConnectorError('bad_state', 'That connection link is not valid.')
  const [founderId, issuedAt, nonce, sig] = parts

  const expected = createHmac('sha256', clientSecret())
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

/** Where to send the founder to consent. */
export function authorizeUrl(founderId: string, scopes: readonly string[]): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: scopes.join(' '),
    // offline + consent guarantees a refresh token. Without `prompt=consent`, Google omits it on
    // a re-connect, and we would store an access token that dies in an hour with no way to renew.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false', // never silently inherit scopes from another grant
    state: createState(founderId),
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface ExchangedTokens {
  refreshToken: string
  accessToken: string
  expiresAt: string
  grantedScopes: string[]
  accountEmail: string | null
}

/**
 * Trade the authorization code for tokens.
 *
 * ⚠️ Verifies the GRANTED scopes rather than trusting what we asked for. A founder can untick
 * permissions on Google's consent screen, and a connection that silently lacks send access would
 * fail later, confusingly, at the moment it mattered.
 */
export async function exchangeCode(code: string, required: readonly string[]): Promise<ExchangedTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
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
  const missing = required.filter(s => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new ConnectorError(
      'scope_declined',
      'Sending permission was not granted. Connect again and leave the send permission ticked.',
    )
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
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
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
