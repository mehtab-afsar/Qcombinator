/**
 * F13 — the Google OAuth handshake for the Gmail-READ connector.
 *
 * A SEPARATE connection from Gmail's send connector (`oauth.ts`), on purpose — not a widening of
 * it. Two independent reasons, both already load-bearing elsewhere in this codebase:
 *
 *  1. `connector_grants` enforces one ACTIVE grant per (founder, provider). Reusing the `gmail`
 *     provider id would mean a founder can't hold the send connection and a read connection at
 *     the same time.
 *  2. `gmail.ts`'s own docstring states the house rule: "a new scope is a new consent and a new
 *     argument — not a quiet widening." Read access (`gmail.readonly` + `gmail.compose`, both
 *     required by Google's own Gmail MCP docs to use the server at all) is strictly broader than
 *     send-only access. A founder who connected Gmail to send interview invites should not
 *     silently end up granting inbox-read access too.
 *
 * Reuses the SAME Google Cloud OAuth client (`GOOGLE_CONNECTOR_CLIENT_ID/SECRET`) as the send
 * connector — it's the same app, just a second, separately-consented purpose — with its OWN
 * redirect URI. Google requires the token-exchange `redirect_uri` to exactly match the one used
 * at authorize time, so this connector's tokens can never be exchanged through the send
 * connector's flow or vice versa, even though both are signed with the same client secret.
 *
 * ⚠️ `createState`/`verifyState` here sign with the SAME secret as `oauth.ts`'s (same OAuth
 * client), unlike Slack's, which has its own distinct app secret. That means a state minted for
 * this connector would also pass signature verification at the send connector's callback, and
 * vice versa. This is deliberately accepted, not overlooked: Google's redirect_uri matching above
 * is the actual boundary between the two flows, and both flows belong to the same founder/same
 * trust boundary regardless — there is no cross-FOUNDER confusion possible, only a same-founder,
 * same-app edge case that Google's own strict matching already closes.
 */

import { env } from '@/lib/env'
import { signState, verifySignedState } from '../oauth-state'
import {
  buildAuthorizeUrl, exchangeGoogleCode, refreshGoogleAccessToken, clientSecret,
  type ExchangedTokens,
} from './google-oauth'

/** Must match a redirect URI registered on the Google client, exactly — a SECOND one, alongside gmail's. */
export function redirectUri(): string {
  return `${env.appUrl}/api/connectors/gmail_read/callback`
}

export function createState(founderId: string): string {
  return signState(clientSecret(), founderId)
}

export function verifyState(state: string): { founderId: string } {
  return verifySignedState(clientSecret(), state)
}

/** Where to send the founder to consent to READING their Gmail. */
export function authorizeUrl(founderId: string, scopes: readonly string[]): string {
  return buildAuthorizeUrl({ redirectUri: redirectUri(), scopes, state: createState(founderId) })
}

export async function exchangeCode(code: string, required: readonly string[]): Promise<ExchangedTokens> {
  return exchangeGoogleCode({
    code,
    redirectUri: redirectUri(),
    requiredScopes: required,
    scopeDeniedMessage: 'Reading permission was not granted. Connect again and leave both permissions ticked.',
  })
}

/** Exchange a stored refresh token for a fresh access token. */
export async function mintAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  return refreshGoogleAccessToken(refreshToken)
}
