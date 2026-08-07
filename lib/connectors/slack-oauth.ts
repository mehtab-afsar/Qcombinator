/**
 * F13 — the Slack OAuth 2.0 v2 handshake for the Slack connector.
 *
 * A DEDICATED Slack App, separate from anything else this product uses — connector authority
 * for one workspace must not be entangled with any other credential (same reasoning as
 * `oauth.ts`'s dedicated Google client for Gmail).
 *
 * ⚠️ BOT TOKEN, NOT USER TOKEN — a deliberate product decision, not a technical default. Posts
 * show up as a distinct "Edge Alpha" bot identity, never as the founder. `exchangeCode` reads
 * the TOP-LEVEL `access_token` from Slack's response (the bot token), never
 * `authed_user.access_token` (a per-user token).
 *
 * Unlike Google, a Slack bot token does not expire and is not refreshed — there is no separate
 * short-lived-access / long-lived-refresh split. `mintAccessToken` is a pass-through, kept as a
 * function only so this fits the same shape every OAuth provider does (see `oauth-provider.ts`).
 */

import { env } from '@/lib/env'
import { ConnectorError } from './types'
import { signState, verifySignedState } from './oauth-state'
import type { ExchangedTokens } from './oauth'

const AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access'

function clientId(): string {
  const id = process.env.SLACK_CONNECTOR_CLIENT_ID
  if (!id) throw new ConnectorError('not_configured', 'The Slack connector is not configured.')
  return id
}

function clientSecret(): string {
  const secret = process.env.SLACK_CONNECTOR_CLIENT_SECRET
  if (!secret) throw new ConnectorError('not_configured', 'The Slack connector is not configured.')
  return secret
}

/** Must match a redirect URL registered on the Slack App, exactly. */
export function redirectUri(): string {
  return `${env.appUrl}/api/connectors/slack/callback`
}

export function createState(founderId: string): string {
  return signState(clientSecret(), founderId)
}

export function verifyState(state: string): { founderId: string } {
  return verifySignedState(clientSecret(), state)
}

/** Where to send the founder to authorize the Edge Alpha bot into their workspace. */
export function authorizeUrl(founderId: string, scopes: readonly string[]): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    // Bot-token scopes ("scope"), never user-token scopes ("user_scope") — see module docstring.
    scope: scopes.join(','),
    state: createState(founderId),
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Trade the authorization code for a bot token.
 *
 * ⚠️ Verifies the GRANTED scopes rather than trusting what we asked for — same reasoning as
 * `oauth.ts`'s Google exchange: a founder can untick a scope on Slack's consent screen.
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
    }),
  })

  if (!res.ok) {
    throw new ConnectorError('exchange_failed', 'Slack refused the connection. Try again.')
  }

  const data = await res.json() as {
    ok?: boolean
    error?: string
    access_token?: string
    scope?: string
    team?: { id?: string; name?: string }
  }

  if (!data.ok || !data.access_token) {
    throw new ConnectorError(
      'exchange_failed',
      `Slack refused the connection${data.error ? `: ${data.error}` : ''}.`,
    )
  }

  const grantedScopes = (data.scope ?? '').split(',').filter(Boolean)
  const missing = required.filter(s => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new ConnectorError(
      'scope_declined',
      'Posting permission was not granted. Connect again and leave it ticked.',
    )
  }

  return {
    refreshToken: data.access_token, // the bot token itself — see the module docstring
    accessToken: data.access_token,
    expiresAt: null, // bot tokens do not expire
    grantedScopes,
    // No "account email" for a workspace bot — show the workspace name in its place so the
    // founder can tell one connected workspace from another.
    accountEmail: data.team?.name ?? null,
  }
}

/** Slack bot tokens do not expire or refresh — return the stored token unchanged. */
export async function mintAccessToken(
  storedToken: string,
): Promise<{ accessToken: string; expiresAt: string | null }> {
  return { accessToken: storedToken, expiresAt: null }
}
