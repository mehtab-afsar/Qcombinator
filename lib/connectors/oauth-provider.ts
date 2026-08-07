/**
 * F13 — provider id → OAuth handshake, the OAuth-side counterpart to `registry.ts`.
 *
 * Fixes two real gaps found when adding Slack as a second provider: `grants.ts` and
 * `app/api/connectors/[provider]/oauth/route.ts` both imported Gmail's OAuth functions directly,
 * so a second provider's OAuth calls would have silently gone to Google no matter which provider
 * was requested. This map is the fix, mirroring the pattern `lib/connectors/registry.ts` already
 * uses for the Connector side — one map, no `switch (provider)` anywhere above it.
 */

import * as gmailOauth from './oauth'
import * as slackOauth from './slack-oauth'
import * as gmailReadOauth from './gmail-read-oauth'
import { ConnectorError } from './types'
import type { ExchangedTokens } from './oauth'

export interface OAuthProvider {
  authorizeUrl(founderId: string, scopes: readonly string[]): string
  verifyState(state: string): { founderId: string }
  exchangeCode(code: string, required: readonly string[]): Promise<ExchangedTokens>
  /** Turn the stored durable credential into a live access token — a no-op for providers whose credential doesn't expire. */
  mintAccessToken(storedCredential: string): Promise<{ accessToken: string; expiresAt: string | null }>
}

const OAUTH_PROVIDERS: Readonly<Record<string, OAuthProvider>> = {
  gmail: {
    authorizeUrl: gmailOauth.authorizeUrl,
    verifyState: gmailOauth.verifyState,
    exchangeCode: gmailOauth.exchangeCode,
    mintAccessToken: gmailOauth.refreshAccessToken,
  },
  slack: {
    authorizeUrl: slackOauth.authorizeUrl,
    verifyState: slackOauth.verifyState,
    exchangeCode: slackOauth.exchangeCode,
    mintAccessToken: slackOauth.mintAccessToken,
  },
  gmail_read: {
    authorizeUrl: gmailReadOauth.authorizeUrl,
    verifyState: gmailReadOauth.verifyState,
    exchangeCode: gmailReadOauth.exchangeCode,
    mintAccessToken: gmailReadOauth.mintAccessToken,
  },
}

/**
 * @throws ConnectorError for an unknown provider — never a silent no-op, same reasoning as
 *         `registry.ts`'s `getConnector`.
 */
export function getOAuthProvider(provider: string): OAuthProvider {
  const oauthProvider = OAUTH_PROVIDERS[provider]
  if (!oauthProvider) {
    throw new ConnectorError('unknown_provider', `No OAuth handshake is registered for '${provider}'.`)
  }
  return oauthProvider
}
