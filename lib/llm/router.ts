/**
 * LLM Routing Layer — Anthropic Claude
 *
 * Maps task classes to optimal Claude model + config.
 *
 * Task classes:
 *   extraction     → Haiku, low temp  (profile builder field parsing)
 *   generation     → Sonnet, mid temp (agent artifact generation)
 *   reasoning      → Haiku, low temp  (evaluator, reconciliation, scoring)
 *   classification → Haiku, zero temp (simple routing)
 *   summarisation  → Haiku, mid temp  (section compaction, digests)
 */

import { llmChat } from './provider';
import type { ToolDefinition, LLMChatResponse } from './types';

export type TaskClass = 'extraction' | 'generation' | 'reasoning' | 'classification' | 'summarisation';
export type ModelTier = 'economy' | 'standard' | 'premium';

const HAIKU  = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

interface RoutingConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

const ROUTING_TABLE: Record<TaskClass, RoutingConfig> = {
  extraction:     { model: HAIKU,  maxTokens: 2000, temperature: 0.1  },
  generation:     { model: SONNET, maxTokens: 3000, temperature: 0.55 },
  reasoning:      { model: SONNET, maxTokens: 1200, temperature: 0.2  },
  classification: { model: HAIKU,  maxTokens: 250,  temperature: 0.0  },
  summarisation:  { model: HAIKU,  maxTokens: 600,  temperature: 0.3  },
};

const TIER_TO_CLASS: Record<ModelTier, TaskClass> = {
  economy:  'classification',
  standard: 'generation',
  premium:  'reasoning',
};

export interface RoutedCallParams {
  taskClass: TaskClass;
  messages: Array<{ role: string; content: string }>;
  tools?: ToolDefinition[];
  overrides?: Partial<RoutingConfig>;
}

export async function routedCall(params: RoutedCallParams): Promise<LLMChatResponse> {
  const config = ROUTING_TABLE[params.taskClass];
  return llmChat({
    messages:    params.messages,
    maxTokens:   params.overrides?.maxTokens   ?? config.maxTokens,
    temperature: params.overrides?.temperature ?? config.temperature,
    tools:       params.tools,
    model:       params.overrides?.model       ?? config.model,
  });
}

export async function routedText(
  taskClass: TaskClass,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  const result = await routedCall({ taskClass, messages, overrides });
  return result.text;
}

export async function tieredText(
  tier: ModelTier,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  return routedText(TIER_TO_CLASS[tier], messages, overrides);
}
