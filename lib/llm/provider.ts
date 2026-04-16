/**
 * Unified LLM chat function with native tool calling.
 *
 * Reads LLM_PROVIDER env var:
 *   - "openrouter" (default) → raw fetch to OpenRouter (OpenAI-compatible)
 *   - "anthropic"            → @anthropic-ai/sdk direct
 *
 * Replicates the error handling from lib/openrouter.ts:
 *   - AbortController 30s timeout
 *   - 429 retry with Retry-After
 *   - 402 fallback key (OpenRouter only)
 *   - Typed OpenRouterError for consistent upstream handling
 */

import Anthropic from '@anthropic-ai/sdk';
import { OpenRouterError } from '@/lib/openrouter';
import type { ToolDefinition, LLMChatResponse } from './types';

const TIMEOUT_MS = 30_000;

function makeAbortController(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

async function waitForRateLimit(res: Response, attempt: number): Promise<void> {
  const retryAfter = res.headers.get('Retry-After');
  // Exponential backoff: 5s → 10s → 20s, capped at Retry-After header if present
  const backoff = Math.min(5_000 * Math.pow(2, attempt), 20_000);
  const waitMs = retryAfter ? Math.min(parseFloat(retryAfter) * 1000, backoff) : backoff;
  await new Promise(resolve => setTimeout(resolve, waitMs));
}

// ─── OpenRouter path ─────────────────────────────────────────────────────────

function toOpenAITools(tools: ToolDefinition[]) {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

async function callOpenRouterWithTools(
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens: number;
    temperature: number;
    tools?: ToolDefinition[];
    model?: string;
  },
): Promise<LLMChatResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new OpenRouterError('No Groq API key configured (GROQ_API_KEY)', 0);

  const hasTools = options.tools && options.tools.length > 0;
  const model = options.model ?? 'llama-3.3-70b-versatile';

  const makeRequest = (signal: AbortSignal) =>
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(hasTools ? { tools: toOpenAITools(options.tools!), tool_choice: 'auto' } : {}),
      }),
    });

  let res!: Response;
  const MAX_ATTEMPTS = 3;

  // Up to 3 attempts with exponential backoff on Groq 429 rate limits
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { controller, clear } = makeAbortController(TIMEOUT_MS);
    try {
      res = await makeRequest(controller.signal);
    } catch (err: unknown) {
      clear();
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError(`Groq request timed out after 30s (attempt ${attempt + 1})`, 0, true);
      }
      throw err;
    }
    clear();

    if (res.status !== 429) break;

    if (attempt + 1 >= MAX_ATTEMPTS) {
      throw new OpenRouterError('Groq rate limit exceeded after 3 attempts — please try again later', 429);
    }
    console.warn(`[llm/provider] Groq rate limited (429) — backoff attempt ${attempt + 1}/${MAX_ATTEMPTS}`);
    await waitForRateLimit(res, attempt);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('[llm/provider] Groq error:', res.status, errText);
    throw new OpenRouterError(`Groq error: ${res.status} ${res.statusText}`, res.status);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;

  const text = (msg?.content ?? '') as string;

  let toolCall: LLMChatResponse['toolCall'] = null;
  const tc = msg?.tool_calls?.[0];
  if (tc?.function) {
    try {
      toolCall = {
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      };
    } catch {
      console.warn('[llm/provider] failed to parse tool_call arguments:', tc.function.arguments);
    }
  }

  return { text, toolCall };
}

// ─── Anthropic path ──────────────────────────────────────────────────────────

let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new OpenRouterError('ANTHROPIC_API_KEY is not configured', 0);
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

async function callAnthropicWithTools(
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens: number;
    temperature: number;
    tools?: ToolDefinition[];
  },
): Promise<LLMChatResponse> {
  const client = getAnthropicClient();

  // Separate system message from conversation messages
  let systemPrompt = '';
  const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
    } else {
      chatMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  // Convert tool definitions to Anthropic format
  const hasTools = options.tools && options.tools.length > 0;
  const anthropicTools = hasTools
    ? options.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      }))
    : undefined;

  const { controller, clear } = makeAbortController(TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: systemPrompt || undefined,
        messages: chatMessages,
        ...(anthropicTools ? { tools: anthropicTools, tool_choice: { type: 'auto' as const } } : {}),
      },
      { signal: controller.signal },
    );

    // Extract text and tool call from content blocks
    let text = '';
    let toolCall: LLMChatResponse['toolCall'] = null;

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      }
      if (block.type === 'tool_use') {
        toolCall = {
          name: block.name,
          args: block.input as Record<string, unknown>,
        };
      }
    }

    return { text, toolCall };
  } catch (err: unknown) {
    // Map Anthropic errors to OpenRouterError for consistent upstream handling
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenRouterError('Anthropic request timed out after 30s', 0, true);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new OpenRouterError('Anthropic rate limit exceeded — please try again later', 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new OpenRouterError('Anthropic authentication failed — check ANTHROPIC_API_KEY', 401);
    }
    if (err instanceof Anthropic.APIError) {
      throw new OpenRouterError(`Anthropic API error: ${err.status} ${err.message}`, err.status ?? 500);
    }
    throw err;
  } finally {
    clear();
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function llmChat(params: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  model?: string;
}): Promise<LLMChatResponse> {
  const { messages, maxTokens = 900, temperature = 0.7, tools, model } = params;
  const provider = process.env.LLM_PROVIDER ?? 'openrouter';

  if (provider === 'anthropic') {
    return callAnthropicWithTools(messages, { maxTokens, temperature, tools });
  }

  try {
    return await callOpenRouterWithTools(messages, { maxTokens, temperature, tools, model });
  } catch (err) {
    // Groq rate-limited — fall back to Anthropic if key is available
    if (err instanceof OpenRouterError && err.statusCode === 429 && process.env.ANTHROPIC_API_KEY) {
      console.warn('[llm/provider] Groq rate limit hit — falling back to Anthropic claude-haiku-4-5');
      return callAnthropicWithTools(messages, { maxTokens, temperature, tools });
    }
    throw err;
  }
}

/**
 * Stream the LLM response token-by-token via an async generator.
 * Yields text delta chunks while accumulating any tool call in the background.
 * After the stream ends, emits a final { done: true, toolCall? } event.
 *
 * Callers should pipe chunks to an SSE response as they arrive.
 */
export async function* llmStream(params: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }> {
  const { messages, maxTokens = 900, temperature = 0.7, tools } = params;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new OpenRouterError('No Groq API key configured (GROQ_API_KEY)', 0);

  const hasTools = tools && tools.length > 0;

  const { controller, clear } = makeAbortController(60_000);

  let res: Response;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        ...(hasTools ? { tools: tools!.map(t => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: 'auto' } : {}),
      }),
    });
  } catch (err) {
    clear();
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenRouterError('Groq stream timed out', 0, true);
    }
    throw err;
  }

  if (res.status === 429) {
    clear();
    throw new OpenRouterError('Groq rate limit exceeded — please try again later', 429);
  }
  if (!res.ok) {
    clear();
    const errText = await res.text();
    throw new OpenRouterError(`Groq stream error: ${res.status} — ${errText}`, res.status);
  }

  // Accumulate tool call fragments across stream chunks
  let toolCallName = '';
  let toolCallArgs = '';
  let toolCallId = '';

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';  // keep incomplete line for next chunk

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // Text delta
          if (delta.content) {
            yield { type: 'delta', text: delta.content };
          }

          // Tool call delta (incremental)
          if (delta.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) toolCallName += tc.function.name;
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          }
        } catch {
          // Malformed SSE chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
    clear();
  }

  // Reconstruct tool call if present
  let toolCall: LLMChatResponse['toolCall'] = null;
  if (toolCallName && toolCallArgs) {
    try {
      toolCall = { name: toolCallName, args: JSON.parse(toolCallArgs) };
    } catch {
      console.warn('[llm/stream] failed to parse tool call args:', toolCallArgs);
    }
  }
  void toolCallId;

  yield { type: 'done', toolCall };
}
