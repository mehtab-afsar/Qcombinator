/**
 * F13 — Slack, the SECOND Connector and the first built on MCP (Model Context Protocol).
 *
 * Everything provider-specific lives here, same as Gmail (`gmail.ts`) — the layer above knows
 * only the `Connector` interface. The one thing that differs on purpose: `send()` talks to
 * Slack's own hosted MCP server instead of hand-writing REST calls, to prove out MCP as a
 * connector transport (docs/F13_F14_DESIGN.md §11 — "the interface is what matters; the
 * transport is an implementation detail behind it"). The transport mechanics themselves (connect,
 * verify a tool exists, call it, timeout, close) live in the shared `./mcp/client.ts` — extracted
 * from here once Gmail-read became a second MCP-based connector; only what's genuinely
 * Slack-specific (server URL, tool name, argument shape, channel allowlist) stays in this file.
 *
 * ⚠️ ASSUMED TOOL SHAPE — VERIFY BEFORE FIRST REAL SEND. Slack's hosted MCP server
 * (https://mcp.slack.com/mcp) is assumed to expose a tool that posts a message to a channel,
 * named `post_to_channel` with `{ channel, text }` arguments, based on available Slack docs at
 * the time this was written. Confirm the actual name/shape via `client.listTools()` the first
 * time this runs against a real workspace — `send()` fails loudly with `ConnectorError` if the
 * assumed tool is missing, rather than assuming success.
 *
 * `reconcile()` returns `null` unconditionally — the same honest "the provider could not tell
 * us" shape Gmail uses when it lacks read scope (gmail.ts). There is no confirmed way to search
 * Slack for a previously-posted message via the tool surface available today; guessing an
 * outcome here would be worse than admitting we don't know.
 *
 * `revoke()` is plain REST, not MCP — same as Gmail's own revoke. Only `send()` needs to prove
 * the MCP-as-transport point this connector exists to test.
 */

import { log } from '@/lib/logger'
import { assertChannelAllowed } from './allowlist'
import { withTimeout, connectAndCall, assertToolExists, McpToolMissingError, type McpToolResult } from './mcp/client'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from './types'

const SLACK_MCP_URL = 'https://mcp.slack.com/mcp'
const SLACK_REVOKE_URL = 'https://slack.com/api/auth.revoke'
const POST_TOOL_NAME = 'post_to_channel' // ⚠️ assumed — see module docstring
const TIMEOUT_MS = 30_000

export const slackConnector: Connector = {
  provider: 'slack',
  // Bot-token scope only: post messages, nothing else. Cannot read channel history or DMs.
  scopes: ['chat:write'],

  async send(grant: ResolvedGrant, request: ConnectorRequest): Promise<ConnectorOutcome> {
    // THE LAST GATE before a real workspace. Throws outside production for any channel that
    // isn't the designated dev/test channel — mirrors gmail.ts's assertRecipientsAllowed.
    assertChannelAllowed(request.channel)

    if (!request.channel) {
      return { status: 'rejected', reason: 'no channel' }
    }

    try {
      const result = await withTimeout(
        connectAndCall(SLACK_MCP_URL, grant.accessToken, async client => {
          await assertToolExists(client, POST_TOOL_NAME)
          const toolResult = await client.callTool({
            name: POST_TOOL_NAME,
            arguments: { channel: request.channel, text: request.body },
          })
          return toolResult as McpToolResult
        }),
        TIMEOUT_MS,
      )

      if (result.isError) {
        const first = result.content[0]
        const reason = first?.type === 'text' && first.text ? first.text : 'slack refused the post'
        log.warn('slack rejected a post', { grantId: grant.grantId, reason })
        return { status: 'rejected', reason }
      }

      return { status: 'sent', providerId: request.idempotencyKey }
    } catch (err) {
      if (err instanceof McpToolMissingError) {
        log.error('slack MCP tool mismatch — see module docstring', { message: err.message })
        return { status: 'unknown', reason: err.message }
      }
      // A timeout or a dropped connection. We genuinely do not know whether Slack accepted it.
      const reason = (err as Error)?.message === 'timed out' ? 'timed out' : 'network error'
      log.error('slack send outcome unknown', { reason, grantId: grant.grantId })
      return { status: 'unknown', reason }
    }
  },

  async reconcile(): Promise<boolean | null> {
    // No confirmed way to search Slack for a previously-posted message via the MCP tool surface
    // available today. Honest `null` — "the provider could not tell us" — beats a guess that
    // could authorise a duplicate post.
    return null
  },

  async revoke(grant: ResolvedGrant): Promise<void> {
    // Plain REST, not MCP — a one-shot revoke doesn't need the transport this connector exists
    // to test, and adds unconfirmed-schema risk for no benefit.
    const res = await fetch(SLACK_REVOKE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${grant.accessToken}` },
    })
    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
    // Slack returns 200 with { ok: false, error: 'invalid_auth' } for an already-dead token —
    // that IS the desired end state, so it is not a failure (same reasoning as gmail.ts's 400).
    if (!res.ok || (!data.ok && data.error !== 'invalid_auth' && data.error !== 'token_revoked')) {
      throw new Error(`slack revoke failed: ${data.error ?? res.status}`)
    }
  },
}
