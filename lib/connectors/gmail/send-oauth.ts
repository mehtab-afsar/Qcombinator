/**
 * F13 — the Google OAuth handshake for the Gmail SEND connector.
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
 *
 * The actual Google OAuth mechanics (code exchange, token refresh) live in the shared
 * `./google-oauth.ts` — extracted once `gmail-read-oauth.ts` needed the identical logic. This
 * file only owns what's specific to the SEND connector: its redirect URI and its scopes.
 */

import { env } from '@/lib/env'
import { signState, verifySignedState } from '../oauth-state'
import {
  buildAuthorizeUrl, exchangeGoogleCode, refreshGoogleAccessToken, clientSecret,
  type ExchangedTokens,
} from './google-oauth'

export type { ExchangedTokens }

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
  return signState(clientSecret(), founderId)
}

/**
 * Verify a returned state and recover the founder it was minted for.
 *
 * @throws ConnectorError on a bad signature, a malformed token, or an expired one — every
 *         branch denies. This is the CSRF gate; there is no "probably fine" path through it.
 */
export function verifyState(state: string): { founderId: string } {
  return verifySignedState(clientSecret(), state)
}

/** Where to send the founder to consent. */
export function authorizeUrl(founderId: string, scopes: readonly string[]): string {
  return buildAuthorizeUrl({ redirectUri: redirectUri(), scopes, state: createState(founderId) })
}

/**
 * Trade the authorization code for tokens.
 *
 * ⚠️ Verifies the GRANTED scopes rather than trusting what we asked for. A founder can untick
 * permissions on Google's consent screen, and a connection that silently lacks send access would
 * fail later, confusingly, at the moment it mattered.
 */
export async function exchangeCode(code: string, required: readonly string[]): Promise<ExchangedTokens> {
  return exchangeGoogleCode({
    code,
    redirectUri: redirectUri(),
    requiredScopes: required,
    scopeDeniedMessage: 'Sending permission was not granted. Connect again and leave the send permission ticked.',
  })
}

/** Exchange a stored refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  return refreshGoogleAccessToken(refreshToken)
}
