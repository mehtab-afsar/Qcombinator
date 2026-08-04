/**
 * A `fetch` that gives up after a bounded time instead of leaving a caller's loading
 * state spinning forever if the network (or anything upstream) hangs. Rejects with a
 * DOMException named 'AbortError' on timeout — check `err.name === 'AbortError'` to
 * distinguish "took too long" from any other fetch failure.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function isTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
