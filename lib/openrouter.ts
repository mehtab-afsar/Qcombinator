/**
 * Shared OpenRouter helper.
 * - AbortController timeout: 30s for non-streaming, 60s for streaming
 * - 429 rate-limit retry: reads Retry-After header, waits up to 15s, retries once
 * - 402 credit exhaustion: retries with OPENROUTER_API_KEY_FALLBACK
 * - Typed OpenRouterError with statusCode + isTimeout
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isTimeout = false
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

const TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 60_000;

function makeAbortController(timeoutMs: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

/** Waits Retry-After seconds (capped at 15s) before resolving */
async function waitForRateLimit(res: Response): Promise<void> {
  const retryAfter = res.headers.get('Retry-After');
  const waitMs = retryAfter ? Math.min(parseFloat(retryAfter) * 1000, 15_000) : 5_000;
  await new Promise(resolve => setTimeout(resolve, waitMs));
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7 } = options;

  const primaryKey  = process.env.OPENROUTER_API_KEY;
  const fallbackKey = process.env.OPENROUTER_API_KEY_FALLBACK;
  if (!primaryKey && !fallbackKey) throw new OpenRouterError('No OpenRouter API key configured', 0);

  const makeRequest = (key: string, signal: AbortSignal) =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Agents',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

  const { controller, clear } = makeAbortController(TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await makeRequest(primaryKey ?? fallbackKey!, controller.signal);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError('OpenRouter request timed out after 30s', 0, true);
      }
      throw err;
    }

    // 429 — rate limited: wait then retry once
    if (res.status === 429) {
      console.warn('[openrouter] rate limited (429) — waiting before retry');
      await waitForRateLimit(res);
      const { controller: c2, clear: clear2 } = makeAbortController(TIMEOUT_MS);
      try {
        res = await makeRequest(primaryKey ?? fallbackKey!, c2.signal);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new OpenRouterError('OpenRouter retry timed out after 30s', 429, true);
        }
        throw err;
      } finally {
        clear2();
      }
      if (res.status === 429) {
        throw new OpenRouterError('OpenRouter rate limit exceeded — please try again later', 429);
      }
    }

    // 402 — primary key hit credit limit: retry with fallback
    if (res.status === 402 && fallbackKey && primaryKey) {
      console.warn('[openrouter] primary key hit limit — switching to fallback');
      const { controller: c3, clear: clear3 } = makeAbortController(TIMEOUT_MS);
      try {
        res = await makeRequest(fallbackKey, c3.signal);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new OpenRouterError('OpenRouter fallback request timed out after 30s', 0, true);
        }
        throw err;
      } finally {
        clear3();
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[openrouter] error:', res.status, errText);
      if (res.status === 402) throw new OpenRouterError('OpenRouter: insufficient credits on all keys', 402);
      throw new OpenRouterError(`OpenRouter error: ${res.status} ${res.statusText}`, res.status);
    }

    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '') as string;
  } finally {
    clear();
  }
}

export async function streamOpenRouter(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<Response> {
  const { maxTokens = 1000, temperature = 0.7 } = options;

  const primaryKey  = process.env.OPENROUTER_API_KEY;
  const fallbackKey = process.env.OPENROUTER_API_KEY_FALLBACK;
  if (!primaryKey && !fallbackKey) throw new OpenRouterError('No OpenRouter API key configured', 0);

  const key = primaryKey ?? fallbackKey!;
  const { controller, clear } = makeAbortController(STREAM_TIMEOUT_MS);

  const makeRequest = (k: string) =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${k}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Agents',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

  try {
    let res: Response;
    try {
      res = await makeRequest(key);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError('OpenRouter stream timed out after 60s', 0, true);
      }
      throw err;
    }

    // 429 — rate limited: wait then retry once
    if (res.status === 429) {
      console.warn('[openrouter] stream rate limited (429) — waiting before retry');
      await waitForRateLimit(res);
      try {
        res = await makeRequest(key);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new OpenRouterError('OpenRouter stream retry timed out', 429, true);
        }
        throw err;
      }
      if (res.status === 429) {
        throw new OpenRouterError('OpenRouter rate limit exceeded — please try again later', 429);
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[openrouter] stream error:', res.status, errText);
      throw new OpenRouterError(`OpenRouter stream error: ${res.status} ${res.statusText}`, res.status);
    }

    // Note: clear() NOT called here — stream is still open; caller must consume it
    // AbortController will fire after 60s if the stream hasn't resolved
    return res;
  } catch (err) {
    clear();
    throw err;
  }
}
