/**
 * Anthropic Claude LLM helper.
 * Replaces the old Groq/OpenRouter implementation.
 * Keeps exported function signatures identical for backward compatibility.
 */

import Anthropic from '@anthropic-ai/sdk';

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

const MODEL = 'claude-haiku-4-5-20251001';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new OpenRouterError('ANTHROPIC_API_KEY is not configured', 0);
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

function splitMessages(messages: OpenRouterMessage[]): {
  system: string;
  chat: Array<{ role: 'user' | 'assistant'; content: string }>;
} {
  let system = '';
  const chat: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n\n' : '') + msg.content;
    } else {
      chat.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
    }
  }
  return { system, chat };
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7 } = options;
  const { system, chat } = splitMessages(messages);

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: chat,
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)
      throw new OpenRouterError('Anthropic rate limit exceeded — please try again later', 429);
    if (err instanceof Anthropic.AuthenticationError)
      throw new OpenRouterError('Anthropic authentication failed — check ANTHROPIC_API_KEY', 401);
    if (err instanceof Anthropic.APIError)
      throw new OpenRouterError(`Anthropic error: ${err.status} ${err.message}`, err.status ?? 500);
    throw err;
  }
}

// streamOpenRouter: returns a Response with SSE body, same contract as before.
export async function streamOpenRouter(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<Response> {
  const { maxTokens = 1000, temperature = 0.7 } = options;
  const { system, chat } = splitMessages(messages);
  const client = getClient();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: maxTokens,
          temperature,
          ...(system ? { system } : {}),
          messages: chat,
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const data = JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
