/**
 * LLM provider dispatch layer.
 * Routes llmChat / llmStream calls to the active LLMProvider implementation.
 * Provider is selected via LLM_PROVIDER env var (default: 'anthropic').
 */

import { getProvider } from './providers'
import type { RoutingTier, ToolDefinition, LLMChatResponse, ChatMessage } from './types'

export async function llmChat(params: {
  messages: ChatMessage[]
  modelTier?: RoutingTier
  maxTokens?: number
  temperature?: number
  tools?: ToolDefinition[]
}): Promise<LLMChatResponse> {
  return getProvider().chat({
    messages:    params.messages,
    modelTier:   params.modelTier   ?? 'capable',
    maxTokens:   params.maxTokens   ?? 900,
    temperature: params.temperature ?? 0.7,
    tools:       params.tools,
  })
}

export async function* llmStream(params: {
  messages: ChatMessage[]
  modelTier?: RoutingTier
  maxTokens?: number
  temperature?: number
  tools?: ToolDefinition[]
}): AsyncGenerator<{ type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }> {
  yield* getProvider().stream({
    messages:    params.messages,
    modelTier:   params.modelTier   ?? 'capable',
    maxTokens:   params.maxTokens   ?? 900,
    temperature: params.temperature ?? 0.7,
    tools:       params.tools,
  })
}
