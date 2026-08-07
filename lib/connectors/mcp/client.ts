/**
 * F13 — the shared MCP transport, extracted from `slack.ts` when Gmail-read became the SECOND
 * MCP-based connector.
 *
 * Deliberately NOT extracted when there was only one example (Slack) — generalising from a single
 * case risks baking in that case's quirks. With two real connectors now using it, this is the
 * genuinely provider-agnostic part: connect, verify the expected tool exists, call it, enforce a
 * timeout, disconnect. None of that changes by which service is on the other end — what DOES
 * change per provider (server URL, tool name, argument shape, auth) stays in that provider's own
 * connector file.
 *
 * What this deliberately does NOT own: authentication. Every MCP-based connector still runs its
 * own OAuth handshake exactly like a non-MCP one (see `slack-oauth.ts`, `gmail-read-oauth.ts`) —
 * MCP only ever receives an already-obtained token as a bearer header. See the wider conversation
 * in docs/F13_F14_DESIGN.md §11: "the interface is what matters; the transport is an
 * implementation detail behind it."
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

/** The bit of an MCP tool result every caller actually reads — not the SDK's full result shape. */
export interface McpToolResult {
  isError?: boolean
  content: ReadonlyArray<{ type?: string; text?: string }>
}

export class McpToolMissingError extends Error {}

/** Race a promise against a timer rather than relying on MCP-internal timeout options no connector here has verified. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), ms)
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>
}

/**
 * Connect to a remote MCP server with a bearer token, run `fn`, then always disconnect —
 * regardless of which provider or which tool `fn` calls.
 */
export async function connectAndCall<T>(
  serverUrl: string,
  accessToken: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const client = new Client({ name: 'edge-alpha', version: '1.0.0' })
  await client.connect(transport)
  try {
    return await fn(client)
  } finally {
    await client.close()
  }
}

/**
 * Verify a tool exists before calling it, and fail loudly (not silently) if the server's actual
 * menu doesn't match what a connector assumed — a schema drift is a bug to surface, not to guess
 * past.
 */
export async function assertToolExists(client: Client, toolName: string): Promise<void> {
  const { tools } = await client.listTools()
  if (!tools.some(t => t.name === toolName)) {
    throw new McpToolMissingError(
      `This MCP server does not expose the expected '${toolName}' tool — ` +
      `verify the current tool name against the provider's MCP docs before retrying.`,
    )
  }
}
