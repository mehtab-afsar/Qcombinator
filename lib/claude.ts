import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isTimeout = false
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

const MODEL = 'claude-haiku-4-5-20251001';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ClaudeError('ANTHROPIC_API_KEY is not configured', 0);
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

function splitMessages(messages: ClaudeMessage[]): {
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

export async function callClaude(
  messages: ClaudeMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7 } = options;
  const { system, chat } = splitMessages(messages);

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45_000)
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: chat,
    });
    clearTimeout(timer)
    return (response as Anthropic.Message).content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b: Anthropic.TextBlock) => b.text)
      .join('');
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError')
      throw new ClaudeError('Anthropic API timeout after 45s', 504, true);
    if (err instanceof Anthropic.RateLimitError)
      throw new ClaudeError('Anthropic rate limit exceeded — please try again later', 429);
    if (err instanceof Anthropic.AuthenticationError)
      throw new ClaudeError('Anthropic authentication failed — check ANTHROPIC_API_KEY', 401);
    if (err instanceof Anthropic.APIError)
      throw new ClaudeError(`Anthropic error: ${err.status} ${err.message}`, err.status ?? 500);
    throw err;
  }
}

export async function streamClaude(
  messages: ClaudeMessage[],
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
