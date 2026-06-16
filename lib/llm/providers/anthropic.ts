import Anthropic from '@anthropic-ai/sdk'
import { ClaudeError } from '@/lib/claude'
import type { LLMProvider, LLMChatResponse, RoutingTier, ToolDefinition, ChatMessage, ContentBlock } from '../types'

const MODEL_MAP: Record<RoutingTier, string> = {
  fast:    'claude-haiku-4-5-20251001',
  capable: 'claude-sonnet-4-5',
}

const CACHE_SENTINEL = '<<<CACHE_BREAK>>>'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError && attempt < maxAttempts - 1) {
        await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500)
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}

function buildSystemParam(system: string): string | Anthropic.TextBlockParam[] {
  const idx = system.indexOf(CACHE_SENTINEL)
  if (idx === -1) return system
  const staticPart  = system.slice(0, idx).trim()
  const dynamicPart = system.slice(idx + CACHE_SENTINEL.length).trim()
  const blocks: Anthropic.TextBlockParam[] = []
  if (staticPart)  blocks.push({ type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } })
  if (dynamicPart) blocks.push({ type: 'text', text: dynamicPart })
  return blocks
}

/** Convert our ContentBlock[] to Anthropic SDK content block params */
function toAnthropicContent(content: string | ContentBlock[]): string | Anthropic.ContentBlockParam[] {
  if (typeof content === 'string') return content
  return content.map(b => {
    if (b.type === 'text')        return { type: 'text' as const, text: b.text }
    if (b.type === 'tool_use')    return { type: 'tool_use' as const, id: b.id, name: b.name, input: b.input }
    if (b.type === 'tool_result') return { type: 'tool_result' as const, tool_use_id: b.tool_use_id, content: b.content }
    return { type: 'text' as const, text: '' }
  })
}

function splitMessages(messages: ChatMessage[]): {
  system: string
  chat: Anthropic.MessageParam[]
} {
  let system = ''
  const chat: Anthropic.MessageParam[] = []
  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n\n' : '') + (typeof msg.content === 'string' ? msg.content : '')
    } else {
      chat.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: toAnthropicContent(msg.content),
      })
    }
  }
  return { system, chat }
}

function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool['input_schema'],
  }))
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new ClaudeError('ANTHROPIC_API_KEY is not configured', 0)
    const heliconeKey = process.env.HELICONE_API_KEY
    this.client = new Anthropic({
      apiKey,
      ...(heliconeKey ? { baseURL: 'https://anthropic.helicone.ai' } : {}),
      defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31',
        ...(heliconeKey ? { 'Helicone-Auth': `Bearer ${heliconeKey}` } : {}),
      },
    })
  }

  async chat(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): Promise<LLMChatResponse> {
    const { messages, modelTier, maxTokens, temperature, tools } = params
    const model = MODEL_MAP[modelTier]
    const { system, chat } = splitMessages(messages)
    const systemParam = system ? buildSystemParam(system) : undefined
    const hasTools = tools && tools.length > 0
    const anthropicTools = hasTools ? toAnthropicTools(tools) : undefined

    try {
      const response = await withRetry(() => this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemParam !== undefined ? { system: systemParam } : {}),
        messages: chat,
        ...(anthropicTools ? { tools: anthropicTools, tool_choice: { type: 'auto' as const } } : {}),
      }))

      let text = ''
      let toolCall: LLMChatResponse['toolCall'] = null
      for (const block of response.content) {
        if (block.type === 'text') text += block.text
        if (block.type === 'tool_use') {
          toolCall = { id: block.id, name: block.name, args: block.input as Record<string, unknown> }
        }
      }
      return { text, toolCall }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError)
        throw new ClaudeError('Anthropic rate limit exceeded — please try again later', 429)
      if (err instanceof Anthropic.AuthenticationError)
        throw new ClaudeError('Anthropic authentication failed — check ANTHROPIC_API_KEY', 401)
      if (err instanceof Anthropic.APIError)
        throw new ClaudeError(`Anthropic error: ${err.status} ${err.message}`, err.status ?? 500)
      throw err
    }
  }

  async *stream(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }> {
    const { messages, modelTier, maxTokens, temperature, tools } = params
    const model = MODEL_MAP[modelTier]
    const { system, chat } = splitMessages(messages)
    const systemParam = system ? buildSystemParam(system) : undefined
    const hasTools = tools && tools.length > 0
    const anthropicTools = hasTools ? toAnthropicTools(tools) : undefined

    const stream = this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemParam !== undefined ? { system: systemParam } : {}),
      messages: chat,
      ...(anthropicTools ? { tools: anthropicTools, tool_choice: { type: 'auto' as const } } : {}),
    })

    let toolCall: LLMChatResponse['toolCall'] = null

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'delta', text: event.delta.text }
        }
      }
      const final = await stream.finalMessage()
      for (const block of final.content) {
        if (block.type === 'tool_use') {
          toolCall = { id: block.id, name: block.name, args: block.input as Record<string, unknown> }
        }
      }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError)
        throw new ClaudeError('Anthropic rate limit exceeded — please try again later', 429)
      if (err instanceof Anthropic.APIError)
        throw new ClaudeError(`Anthropic stream error: ${err.status} ${err.message}`, err.status ?? 500)
      throw err
    }

    yield { type: 'done', toolCall }
  }
}
