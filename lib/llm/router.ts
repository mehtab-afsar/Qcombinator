/**
 * LLM Routing Layer
 *
 * Maps task classes to capability tiers + config. Provider-agnostic.
 *
 * Task classes:
 *   extraction     → fast, low temp  (profile builder field parsing)
 *   generation     → capable, mid temp (agent artifact generation)
 *   reasoning      → capable, low temp (evaluator, reconciliation, scoring)
 *   classification → fast, zero temp (simple routing)
 *   summarisation  → fast, mid temp  (section compaction, digests)
 */

import { getProvider } from './providers'
import type { RoutingTier, ToolDefinition, LLMChatResponse, ChatMessage } from './types'
import { createAdminClient } from '@/lib/supabase/server'
import { estimateCost } from './pricing'
import { log } from '@/lib/logger'

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; toolCall: LLMChatResponse['toolCall']; stopReason?: string; usage?: LLMChatResponse['usage']; model?: string }

export type TaskClass = 'extraction' | 'generation' | 'reasoning' | 'classification' | 'summarisation'
export type ModelTier = 'economy' | 'standard' | 'premium'

interface RoutingConfig {
  modelTier: RoutingTier
  maxTokens: number
  temperature: number
}

const ROUTING_TABLE: Record<TaskClass, RoutingConfig> = {
  extraction:     { modelTier: 'fast',    maxTokens: 2000, temperature: 0.1  },
  generation:     { modelTier: 'capable', maxTokens: 8000, temperature: 0.55 },
  reasoning:      { modelTier: 'capable', maxTokens: 1200, temperature: 0.2  },
  classification: { modelTier: 'fast',    maxTokens: 250,  temperature: 0.0  },
  summarisation:  { modelTier: 'fast',    maxTokens: 600,  temperature: 0.3  },
}

const TIER_TO_CLASS: Record<ModelTier, TaskClass> = {
  economy:  'classification',
  standard: 'generation',
  premium:  'reasoning',
}

/**
 * Identifies the Program/Action/Asset a call was made for, so its usage can be attributed.
 * Optional — supplying it is what turns on writing to ai_usage_log (Phase 10 Part 1). Every
 * existing caller omits it and is unaffected; this is one function with an additive capability,
 * not a second way to call the LLM (CLAUDE.md "one Execution Engine").
 */
export interface UsageContext {
  founderId: string
  programId?: string
  actionId?: string
  assetId?: string
  executionId?: string
}

export interface RoutedCallParams {
  taskClass: TaskClass
  /** Plain text is the common case; a ContentBlock[] carries a document/image for vision calls. */
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  overrides?: Partial<RoutingConfig>
  usageContext?: UsageContext
}

/**
 * Best-effort: a logging failure must never break a real LLM call that already succeeded. Silent
 * no-op when the provider didn't report usage (e.g. the Groq fallback).
 */
async function recordUsage(response: LLMChatResponse, ctx: UsageContext, latencyMs: number): Promise<void> {
  if (!response.usage || !response.model) return
  try {
    const admin = createAdminClient()
    await admin.from('ai_usage_log').insert({
      founder_id: ctx.founderId,
      program_id: ctx.programId ?? null,
      action_id: ctx.actionId ?? null,
      asset_id: ctx.assetId ?? null,
      execution_id: ctx.executionId ?? null,
      model: response.model,
      input_tokens: response.usage.inputTokens,
      output_tokens: response.usage.outputTokens,
      estimated_cost_usd: estimateCost(response.model, response.usage),
      latency_ms: latencyMs,
    })
  } catch (err) {
    log.warn('ai usage log write failed', { err: (err as Error)?.message })
  }
}

export async function routedCall(params: RoutedCallParams): Promise<LLMChatResponse> {
  const config = ROUTING_TABLE[params.taskClass]
  const start = Date.now()
  const response = await getProvider().chat({
    messages:    params.messages,
    modelTier:   params.overrides?.modelTier   ?? config.modelTier,
    maxTokens:   params.overrides?.maxTokens   ?? config.maxTokens,
    temperature: params.overrides?.temperature ?? config.temperature,
    tools:       params.tools,
  })
  if (params.usageContext) await recordUsage(response, params.usageContext, Date.now() - start)
  return response
}

export async function routedText(
  taskClass: TaskClass,
  messages: ChatMessage[],
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  const result = await routedCall({ taskClass, messages, overrides })
  return result.text
}

export async function tieredText(
  tier: ModelTier,
  messages: ChatMessage[],
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  return routedText(TIER_TO_CLASS[tier], messages, overrides)
}

export async function* routedStream(
  taskClass: TaskClass,
  messages: ChatMessage[],
  overrides?: Partial<RoutingConfig>,
  usageContext?: UsageContext,
): AsyncGenerator<StreamEvent> {
  const config = ROUTING_TABLE[taskClass]
  const start = Date.now()
  for await (const event of getProvider().stream({
    messages,
    modelTier:   overrides?.modelTier   ?? config.modelTier,
    maxTokens:   overrides?.maxTokens   ?? config.maxTokens,
    temperature: overrides?.temperature ?? config.temperature,
  })) {
    if (event.type === 'done' && usageContext && event.usage && event.model) {
      await recordUsage({ text: '', toolCall: event.toolCall, usage: event.usage, model: event.model }, usageContext, Date.now() - start)
    }
    yield event
  }
}
