/**
 * Groq LLM Provider — OpenAI-compatible API.
 *
 * Used as a fallback when the Anthropic circuit breaker opens.
 * Models:
 *   fast:    llama-3.1-8b-instant  (low latency)
 *   capable: llama-3.3-70b-versatile (quality comparable to Claude Haiku)
 *
 * Limitation: tool_use is not supported in the fallback path — tool calls
 * are omitted and the model responds in text only. This is intentional:
 * degraded functionality beats total unavailability during Anthropic outages.
 *
 * Requires GROQ_API_KEY env var.
 */

import type { LLMProvider, LLMChatResponse, RoutingTier, ToolDefinition, ChatMessage } from '../types'

const MODEL_MAP: Record<RoutingTier, string> = {
  fast:    'llama-3.1-8b-instant',
  capable: 'llama-3.3-70b-versatile',
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

function flattenContent(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content
  return content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
}

export class GroqProvider implements LLMProvider {
  private readonly apiKey: string

  constructor() {
    const key = process.env.GROQ_API_KEY
    if (!key) throw new Error('[GroqProvider] GROQ_API_KEY is not configured')
    this.apiKey = key
  }

  async chat(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): Promise<LLMChatResponse> {
    const { messages, modelTier, maxTokens, temperature } = params
    const model = MODEL_MAP[modelTier]

    // Flatten messages to plain text — Groq API uses OpenAI format
    const groqMessages = messages
      .filter(m => m.role !== 'system' || typeof m.content === 'string')
      .map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
        content: flattenContent(m.content),
      }))
      // Skip tool_result / tool_use blocks that don't translate cleanly
      .filter(m => m.content.trim().length > 0)

    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[GroqProvider] API error ${response.status}: ${errText}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const text = data.choices[0]?.message?.content ?? ''
    return { text, toolCall: null }
  }

  // Groq fallback does not support streaming — yields the full response as one delta
  async *stream(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: null }> {
    const result = await this.chat(params)
    yield { type: 'delta', text: result.text }
    yield { type: 'done', toolCall: null }
  }
}
