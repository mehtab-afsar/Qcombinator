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
import type { RoutingTier, ToolDefinition, LLMChatResponse } from './types'

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

export interface RoutedCallParams {
  taskClass: TaskClass
  messages: Array<{ role: string; content: string }>
  tools?: ToolDefinition[]
  overrides?: Partial<RoutingConfig>
}

export async function routedCall(params: RoutedCallParams): Promise<LLMChatResponse> {
  const config = ROUTING_TABLE[params.taskClass]
  return getProvider().chat({
    messages:    params.messages,
    modelTier:   params.overrides?.modelTier   ?? config.modelTier,
    maxTokens:   params.overrides?.maxTokens   ?? config.maxTokens,
    temperature: params.overrides?.temperature ?? config.temperature,
    tools:       params.tools,
  })
}

export async function routedText(
  taskClass: TaskClass,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  const result = await routedCall({ taskClass, messages, overrides })
  return result.text
}

export async function tieredText(
  tier: ModelTier,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  return routedText(TIER_TO_CLASS[tier], messages, overrides)
}
