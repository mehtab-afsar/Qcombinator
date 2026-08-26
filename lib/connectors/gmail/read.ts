/**
 * F13 — Gmail-READ, the THIRD Connector, and the second built on MCP.
 *
 * A separate connector from Gmail's send connector (`gmail.ts`) — see `gmail-read-oauth.ts`'s
 * docstring for why. It exists to feed Carter's "customer conversation tracking" — the one thing
 * the old, removed Settings integration cards named that this product never actually built.
 *
 * ⚠️ SCOPE OF THIS FILE, ON PURPOSE. This is the CONNECTOR — OAuth, vault storage, revoke, and an
 * on-demand way to search/read a thread. As of the `founder_pulled_data` mechanism, its result IS
 * reachable from `monitor_and_classify_responses`'s Company Context (P005) — but only ever via a
 * founder's explicit click (`app/api/actions/[actionId]/pull-data/route.ts`), which caches the
 * result; `lib/rhythm/run.ts`'s `pulledDataContextFor` then only ever reads that cache. Nothing
 * here is called automatically from inside a Rhythm cycle step — a cycle making a live call to
 * this connector on its own, unattended, is still the "autonomous external signal" capability a
 * founder pilot hasn't yet justified building. Whatever calls `searchGmailThreads`/`getGmailThread`
 * must trace back to a founder's own click, not a cron or a cycle step.
 *
 * ⚠️ `send()` is NOT meaningful here and honestly refuses rather than silently no-op-ing — this
 * connector only reads. It still implements the full `Connector` interface so it can reuse the
 * exact same registry/vault/grant/revoke machinery every other connector already has (F13), which
 * is worth more than a "purer" interface would be.
 *
 * ⚠️ ASSUMED TOOL ARGUMENTS — VERIFY BEFORE FIRST REAL CALL. Google's own MCP reference
 * (developers.google.com/workspace/gmail/api/reference/mcp) confirms the tool NAMES
 * (`search_threads`, `get_thread`) but not their exact argument schemas. `{ query }` and
 * `{ threadId }` are the obvious shapes given the tool names and Gmail's existing search-query
 * syntax; confirm via `client.listTools()`'s returned input schema the first time this runs
 * against a real account, the same defensive posture `slack.ts` already takes for its own tool.
 *
 * `reconcile()` and the redundant recipient-shaped fields of `Connector` don't apply to a
 * read-only connector — same honest-`null` shape Slack and Gmail-send use when a question
 * genuinely can't be answered.
 */

import { assertToolExists, connectAndCall, withTimeout, type McpToolResult } from '../mcp/client'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from '../types'

const GMAIL_MCP_URL = 'https://gmailmcp.googleapis.com/mcp/v1'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const TIMEOUT_MS = 30_000

const SEARCH_TOOL_NAME = 'search_threads' // ⚠️ assumed argument shape — see module docstring
const GET_THREAD_TOOL_NAME = 'get_thread'  // ⚠️ assumed argument shape — see module docstring

export interface GmailThreadSummary {
  id: string
  snippet?: string
  subject?: string
}

export interface GmailThreadDetail {
  id: string
  messages: ReadonlyArray<{ id: string; snippet?: string; body?: string }>
}

/** Pull the tool's text content and parse it as JSON — Google's MCP tools return structured data as a text block. */
function parseToolJson<T>(result: McpToolResult, fallback: T): T {
  const first = result.content[0]
  if (!first?.text) return fallback
  try {
    return JSON.parse(first.text) as T
  } catch {
    return fallback
  }
}

/**
 * Search the connected inbox. Founder-triggered only — see the module docstring's scope warning.
 */
export async function searchGmailThreads(grant: ResolvedGrant, query: string): Promise<GmailThreadSummary[]> {
  return withTimeout(
    connectAndCall(GMAIL_MCP_URL, grant.accessToken, async client => {
      await assertToolExists(client, SEARCH_TOOL_NAME)
      const result = await client.callTool({
        name: SEARCH_TOOL_NAME,
        arguments: { query },
      }) as McpToolResult
      return parseToolJson<GmailThreadSummary[]>(result, [])
    }),
    TIMEOUT_MS,
  )
}

/**
 * Read one thread. Founder-triggered only — see the module docstring's scope warning.
 */
export async function getGmailThread(grant: ResolvedGrant, threadId: string): Promise<GmailThreadDetail | null> {
  return withTimeout(
    connectAndCall(GMAIL_MCP_URL, grant.accessToken, async client => {
      await assertToolExists(client, GET_THREAD_TOOL_NAME)
      const result = await client.callTool({
        name: GET_THREAD_TOOL_NAME,
        arguments: { threadId },
      }) as McpToolResult
      return parseToolJson<GmailThreadDetail | null>(result, null)
    }),
    TIMEOUT_MS,
  )
}

export const gmailReadConnector: Connector = {
  provider: 'gmail_read',
  // Both required by Google's own Gmail MCP docs to use the server at all — readonly alone isn't
  // sufficient. We simply never call anything that needs the compose half (see this file's scope).
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
  ],

  async send(_grant: ResolvedGrant, _request: ConnectorRequest): Promise<ConnectorOutcome> {
    // Honest refusal, not a silent no-op — this connection was never granted to send anything,
    // and nothing in this product should ever call this, but if something does by mistake it
    // must fail loudly rather than pretend to have done something.
    return { status: 'rejected', reason: 'this connection only reads Gmail, it cannot send' }
  },

  async reconcile(): Promise<boolean | null> {
    return null
  },

  async revoke(grant: ResolvedGrant): Promise<void> {
    const res = await fetch(`${REVOKE_URL}?token=${encodeURIComponent(grant.accessToken)}`, {
      method: 'POST',
    })
    // Google returns 400 for an already-invalid token — the desired end state, not an error.
    if (!res.ok && res.status !== 400) {
      throw new Error(`gmail_read revoke failed with ${res.status}`)
    }
  },
}
