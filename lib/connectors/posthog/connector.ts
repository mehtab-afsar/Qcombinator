/**
 * F13 — PostHog, the FIFTH Connector, and the second built on MCP.
 *
 * Same shape as `gmail-read.ts`: `Connector` implemented for lifecycle (vault/revoke) purposes
 * only, since reading analytics doesn't fit `send`/`reconcile` — the real capability is a plain
 * exported function on top of the shared `./mcp/client.ts` transport.
 *
 * ⚠️ SCOPE OF THIS FILE, ON PURPOSE. This feeds two mapped-but-unbuilt needs (Monitor Lead
 * Generation / P003, the product-health half of Monitor Health Scores / P006) — neither program
 * exists yet. Nothing here wires results into any Executive's prompt or Company Context; that's
 * still the ADR-028 "autonomous external signal" decision, not reopened by this file. Whatever
 * calls `queryPostHogTrends` today must be founder-triggered, same rule as Gmail-read.
 *
 * ⚠️ ASSUMED TOOL NAME — VERIFY BEFORE FIRST REAL CALL. `query-trends` is the closest match found
 * in PostHog's published MCP tool list at the time this was written; `send()` — actually
 * `queryPostHogTrends()` here — verifies it exists via `listTools()` first and fails loudly if
 * PostHog's server doesn't match, same defensive posture as Slack's `post_to_channel`.
 */

import { log } from '@/lib/logger'
import { assertToolExists, connectAndCall, withTimeout, type McpToolResult } from '../mcp/client'
import { revocationEndpoint } from './oauth'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from '../types'

const POSTHOG_MCP_URL = 'https://mcp.posthog.com/mcp'
const TIMEOUT_MS = 30_000
const QUERY_TOOL_NAME = 'query-trends' // ⚠️ assumed — see module docstring

export interface PostHogTrendResult {
  data: unknown
}

/** Pull the tool's text content and parse it as JSON. Founder-triggered only — see module docstring. */
export async function queryPostHogTrends(grant: ResolvedGrant, query: string): Promise<PostHogTrendResult> {
  return withTimeout(
    connectAndCall(POSTHOG_MCP_URL, grant.accessToken, async client => {
      await assertToolExists(client, QUERY_TOOL_NAME)
      const result = await client.callTool({
        name: QUERY_TOOL_NAME,
        arguments: { query },
      }) as McpToolResult
      const first = result.content[0]
      let data: unknown = null
      if (first?.text) {
        try { data = JSON.parse(first.text) } catch { data = first.text }
      }
      return { data }
    }),
    TIMEOUT_MS,
  )
}

export const posthogConnector: Connector = {
  provider: 'posthog',
  // Read-only analytics scopes only — never write:*, never destructive:*.
  scopes: ['insight:read', 'dashboard:read', 'query:read'],

  async send(_grant: ResolvedGrant, _request: ConnectorRequest): Promise<ConnectorOutcome> {
    return { status: 'rejected', reason: 'this connection only reads PostHog analytics, it cannot send' }
  },

  async reconcile(): Promise<boolean | null> {
    return null
  },

  async revoke(grant: ResolvedGrant): Promise<void> {
    const endpoint = await revocationEndpoint()
    if (!endpoint) {
      // Honest gap, not a silent one: PostHog's discovery document didn't advertise a
      // revocation endpoint at the time this was written. Deliberately does NOT throw —
      // `grants.ts` aborts the whole disconnect if this throws, which would permanently trap a
      // founder who wants to disconnect. PostHog's access tokens are short-lived (unlike
      // Slack's/Stripe's), so the residual risk is bounded: it expires on its own soon, and the
      // refresh token stops being usable by anyone the moment this grant's vault secret is
      // deleted, which still happens right after this returns. Re-check discovery once this is
      // live — if PostHog adds one later, this starts actually revoking instead of just logging.
      log.warn('posthog revoke: no discovered revocation endpoint — relying on natural token expiry', {
        grantId: grant.grantId,
      })
      return
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: grant.accessToken }),
    })
    if (!res.ok) {
      throw new Error(`posthog revoke failed with ${res.status}`)
    }
  },
}
