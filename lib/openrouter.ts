/**
 * Groq LLM helper (drop-in replacement for OpenRouter).
 * Groq is OpenAI-compatible — same request/response format.
 * - AbortController timeout: 30s non-streaming, 60s streaming
 * - 429 rate-limit retry: reads Retry-After header, waits up to 15s, retries up to 3 times
 * - Typed OpenRouterError kept for backward compatibility with callers
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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';
const TIMEOUT_MS        = 30_000;
const STREAM_TIMEOUT_MS = 60_000;

function makeAbortController(timeoutMs: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new OpenRouterError('No Groq API key configured (GROQ_API_KEY)', 0);

  const makeRequest = (signal: AbortSignal) =>
    fetch(GROQ_URL, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
    });

  const { controller, clear } = makeAbortController(TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await makeRequest(controller.signal);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError('Groq request timed out after 30s', 0, true);
      }
      throw err;
    }

    // 429 — rate limited: retry up to 3 times with backoff
    let retryCount = 0;
    while (res.status === 429 && retryCount < 3) {
      retryCount++;
      console.warn(`[groq] rate limited (429) — retry ${retryCount}/3`);
      await waitForRateLimit(res);
      const { controller: cR, clear: clearR } = makeAbortController(TIMEOUT_MS);
      try {
        res = await makeRequest(cR.signal);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new OpenRouterError('Groq retry timed out after 30s', 429, true);
        }
        throw err;
      } finally {
        clearR();
      }
    }
    if (res.status === 429) {
      throw new OpenRouterError('Groq rate limit exceeded — please try again later', 429);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[groq] error:', res.status, errText);
      throw new OpenRouterError(`Groq error: ${res.status} ${res.statusText}`, res.status);
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new OpenRouterError('No Groq API key configured (GROQ_API_KEY)', 0);

  const { controller, clear } = makeAbortController(STREAM_TIMEOUT_MS);

  const makeRequest = () =>
    fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens, stream: true }),
    });

  try {
    let res: Response;
    try {
      res = await makeRequest();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError('Groq stream timed out after 60s', 0, true);
      }
      throw err;
    }

    // 429 — rate limited: wait then retry
    if (res.status === 429) {
      console.warn('[groq] stream rate limited (429) — waiting before retry');
      await waitForRateLimit(res);
      try {
        res = await makeRequest();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new OpenRouterError('Groq stream retry timed out', 429, true);
        }
        throw err;
      }
      if (res.status === 429) {
        throw new OpenRouterError('Groq rate limit exceeded — please try again later', 429);
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[groq] stream error:', res.status, errText);
      throw new OpenRouterError(`Groq stream error: ${res.status} ${res.statusText}`, res.status);
    }

    return res;
  } catch (err) {
    clear();
    throw err;
  }
}
