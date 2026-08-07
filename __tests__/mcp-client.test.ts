/**
 * F13 — the shared MCP transport (`lib/connectors/mcp/client.ts`), extracted from `slack.ts` once
 * Gmail-read became a second MCP-based connector. Tested here in isolation for the first time —
 * it was untested private code inside `slack.ts` before.
 */

const connect = jest.fn(async () => {})
const close = jest.fn(async () => {})
const listTools = jest.fn(async () => ({ tools: [{ name: 'known_tool' }] }))

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({ connect, close, listTools })),
}))
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: jest.fn().mockImplementation((url: URL, opts: unknown) => ({ url, opts })),
}))

import { withTimeout, connectAndCall, assertToolExists, McpToolMissingError } from '@/lib/connectors/mcp/client'

beforeEach(() => jest.clearAllMocks())

describe('withTimeout', () => {
  it('resolves normally when the promise wins the race', async () => {
    await expect(withTimeout(Promise.resolve('done'), 1000)).resolves.toBe('done')
  })

  it('rejects when the timer wins the race', async () => {
    const never = new Promise(() => {}) // never resolves
    await expect(withTimeout(never, 10)).rejects.toThrow('timed out')
  })

  it('propagates a rejection from the promise itself, not a timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom')
  })
})

describe('connectAndCall', () => {
  it('connects, runs the callback, and always closes — even on success', async () => {
    const result = await connectAndCall('https://example.com/mcp', 'token-abc', async () => 'ok')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(result).toBe('ok')
  })

  it('still closes when the callback throws — no leaked connection', async () => {
    await expect(
      connectAndCall('https://example.com/mcp', 'token-abc', async () => { throw new Error('callback failed') }),
    ).rejects.toThrow('callback failed')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('passes the access token as a bearer header on the transport', async () => {
    const { StreamableHTTPClientTransport } = jest.requireMock('@modelcontextprotocol/sdk/client/streamableHttp.js') as {
      StreamableHTTPClientTransport: jest.Mock
    }
    await connectAndCall('https://example.com/mcp', 'secret-token', async () => null)
    const [, opts] = StreamableHTTPClientTransport.mock.calls[0]
    expect(opts.requestInit.headers.Authorization).toBe('Bearer secret-token')
  })
})

describe('assertToolExists', () => {
  it('resolves silently when the tool is present', async () => {
    const client = { listTools } as unknown as Parameters<typeof assertToolExists>[0]
    await expect(assertToolExists(client, 'known_tool')).resolves.toBeUndefined()
  })

  it('throws McpToolMissingError, loudly, when the tool is absent', async () => {
    const client = { listTools } as unknown as Parameters<typeof assertToolExists>[0]
    await expect(assertToolExists(client, 'nonexistent_tool')).rejects.toBeInstanceOf(McpToolMissingError)
  })
})
