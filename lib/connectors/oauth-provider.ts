/**
 * F13 — provider id → OAuth handshake, the OAuth-side counterpart to `registry.ts`.
 *
 * Fixes two real gaps found when adding Slack as a second provider: `grants.ts` and
 * `app/api/connectors/[provider]/oauth/route.ts` both imported Gmail's OAuth functions directly,
 * so a second provider's OAuth calls would have silently gone to Google no matter which provider
 * was requested. This map is the fix, mirroring the pattern `lib/connectors/registry.ts` already
 * uses for the Connector side — one map, no `switch (provider)` anywhere above it.
 *
 * ⚠️ `authorizeUrl` IS ASYNC AND `exchangeCode` TAKES A `state` PARAMETER — widened for PostHog,
 * the first provider needing OAuth-endpoint discovery (async) and PKCE (needs `state` to recover
 * the code verifier). Gmail/Slack/Gmail-read/Stripe's own files are UNCHANGED — each is sync and
 * ignores `state` internally — this file adapts them to the wider shape inline, right here, so
 * the widening cost the other four nothing.
 */

import * as gmailOauth from './gmail/send-oauth'
import * as slackOauth from './slack/oauth'
import * as gmailReadOauth from './gmail/read-oauth'
import * as stripeOauth from './stripe/oauth'
import * as posthogOauth from './posthog/oauth'
import * as apolloOauth from './apollo/oauth'
import { ConnectorError } from './types'
import type { ExchangedTokens } from './gmail/google-oauth'

export interface OAuthProvider {
  authorizeUrl(founderId: string, scopes: readonly string[]): Promise<string>
  verifyState(state: string): { founderId: string }
  exchangeCode(code: string, required: readonly string[], state: string): Promise<ExchangedTokens>
  /** Turn the stored durable credential into a live access token — a no-op for providers whose credential doesn't expire. */
  mintAccessToken(storedCredential: string): Promise<{ accessToken: string; expiresAt: string | null }>
}

const OAUTH_PROVIDERS: Readonly<Record<string, OAuthProvider>> = {
  gmail: {
    authorizeUrl: async (founderId, scopes) => gmailOauth.authorizeUrl(founderId, scopes),
    verifyState: gmailOauth.verifyState,
    exchangeCode: async (code, required) => gmailOauth.exchangeCode(code, required),
    mintAccessToken: gmailOauth.refreshAccessToken,
  },
  slack: {
    authorizeUrl: async (founderId, scopes) => slackOauth.authorizeUrl(founderId, scopes),
    verifyState: slackOauth.verifyState,
    exchangeCode: async (code, required) => slackOauth.exchangeCode(code, required),
    mintAccessToken: slackOauth.mintAccessToken,
  },
  gmail_read: {
    authorizeUrl: async (founderId, scopes) => gmailReadOauth.authorizeUrl(founderId, scopes),
    verifyState: gmailReadOauth.verifyState,
    exchangeCode: async (code, required) => gmailReadOauth.exchangeCode(code, required),
    mintAccessToken: gmailReadOauth.mintAccessToken,
  },
  stripe: {
    authorizeUrl: async (founderId, scopes) => stripeOauth.authorizeUrl(founderId, scopes),
    verifyState: stripeOauth.verifyState,
    exchangeCode: async (code, required) => stripeOauth.exchangeCode(code, required),
    mintAccessToken: stripeOauth.mintAccessToken,
  },
  posthog: {
    authorizeUrl: posthogOauth.authorizeUrl,
    verifyState: posthogOauth.verifyState,
    exchangeCode: (code, required, state) => posthogOauth.exchangeCode(code, required, state),
    mintAccessToken: posthogOauth.mintAccessToken,
  },
  // ⚠️ NOT AN OAUTH PROVIDER — Apollo authenticates with an API key, and its entry here exists
  // solely because `resolveGrant` calls `mintAccessToken()` on EVERY use of every grant. Omit
  // this and resolveGrant throws `unknown_provider`, which its own catch reads as "the provider
  // refused the refresh" and marks the founder's grant expired — a connection that silently
  // kills itself on first use. The three handshake members throw loudly; see ./apollo/oauth.ts.
  apollo: {
    authorizeUrl: apolloOauth.authorizeUrl,
    verifyState: apolloOauth.verifyState,
    exchangeCode: apolloOauth.exchangeCode,
    mintAccessToken: apolloOauth.mintAccessToken,
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
