import type { LLMProvider, LLMChatResponse, RoutingTier, ToolDefinition, ChatMessage } from '../types'
import { AnthropicProvider } from './anthropic'
import { GroqProvider } from './groq'
import { isCircuitOpen, recordFailure, recordSuccess } from '@/lib/circuit-breaker'

// Lazy singletons — created on first use
let _anthropic: LLMProvider | null = null
let _groq: LLMProvider | null = null

function getAnthropic(): LLMProvider {
  if (!_anthropic) _anthropic = new AnthropicProvider()
  return _anthropic
}

function getGroq(): LLMProvider | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!_groq) {
    try { _groq = new GroqProvider() } catch { return null }
  }
  return _groq
}

/**
 * Returns a provider that automatically falls back to Groq when
 * the Anthropic circuit breaker is open (≥3 consecutive failures).
 *
 * Failures on Anthropic are recorded so the circuit can trip.
 * Successes reset the counter. If Groq is also unavailable (no key),
 * the Anthropic error is re-thrown as usual.
 */
class FallbackProvider implements LLMProvider {
  async chat(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): Promise<LLMChatResponse> {
    if (isCircuitOpen('anthropic')) {
      const groq = getGroq()
      if (groq) return groq.chat(params)
    }
    try {
      const result = await getAnthropic().chat(params)
      recordSuccess('anthropic')
      return result
    } catch (err) {
      recordFailure('anthropic')
      const groq = getGroq()
      if (groq) {
        try { return await groq.chat(params) } catch { /* Groq also failed — throw original */ }
      }
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
    if (isCircuitOpen('anthropic')) {
      const groq = getGroq()
      if (groq) { yield* groq.stream(params); return }
    }
    try {
      // Track whether Anthropic stream completes without error
      let succeeded = false
      try {
        yield* getAnthropic().stream(params)
        succeeded = true
      } finally {
        if (succeeded) recordSuccess('anthropic')
        else recordFailure('anthropic')
      }
    } catch (err) {
      const groq = getGroq()
      if (groq) { yield* groq.stream(params); return }
      throw err
    }
  }
}

let _fallback: FallbackProvider | null = null

export function getProvider(): LLMProvider {
  if (!_fallback) _fallback = new FallbackProvider()
  return _fallback
}
