/**
 * Unified LLM chat function using Anthropic Claude exclusively.
 * All LLM calls (extraction, generation, reasoning, streaming) go through Anthropic.
 */

import Anthropic from '@anthropic-ai/sdk';
import { OpenRouterError } from '@/lib/openrouter';
import type { ToolDefinition, LLMChatResponse } from './types';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new OpenRouterError('ANTHROPIC_API_KEY is not configured', 0);
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

function splitMessages(messages: Array<{ role: string; content: string }>): {
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

export async function llmChat(params: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  model?: string;
}): Promise<LLMChatResponse> {
  const { messages, maxTokens = 900, temperature = 0.7, tools, model = 'claude-haiku-4-5-20251001' } = params;
  const { system, chat } = splitMessages(messages);
  const client = getClient();

  const hasTools = tools && tools.length > 0;
  const anthropicTools = hasTools
    ? tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      }))
    : undefined;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: chat,
      ...(anthropicTools ? { tools: anthropicTools, tool_choice: { type: 'auto' as const } } : {}),
    });

    let text = '';
    let toolCall: LLMChatResponse['toolCall'] = null;

    for (const block of response.content) {
      if (block.type === 'text') text += block.text;
      if (block.type === 'tool_use') {
        toolCall = { name: block.name, args: block.input as Record<string, unknown> };
      }
    }

    return { text, toolCall };
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

/**
 * Stream the LLM response token-by-token via an async generator.
 * Yields { type: 'delta', text } chunks, then a final { type: 'done', toolCall? }.
 */
export async function* llmStream(params: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }> {
  const { messages, maxTokens = 900, temperature = 0.7, tools } = params;
  const { system, chat } = splitMessages(messages);
  const client = getClient();

  const hasTools = tools && tools.length > 0;
  const anthropicTools = hasTools
    ? tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      }))
    : undefined;

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: chat,
    ...(anthropicTools ? { tools: anthropicTools, tool_choice: { type: 'auto' as const } } : {}),
  });

  let toolCall: LLMChatResponse['toolCall'] = null;

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'delta', text: event.delta.text };
      }
    }
    // Extract complete tool call from the final message
    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === 'tool_use') {
        toolCall = { name: block.name, args: block.input as Record<string, unknown> };
      }
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)
      throw new OpenRouterError('Anthropic rate limit exceeded — please try again later', 429);
    if (err instanceof Anthropic.APIError)
      throw new OpenRouterError(`Anthropic stream error: ${err.status} ${err.message}`, err.status ?? 500);
    throw err;
  }

  yield { type: 'done', toolCall };
}
