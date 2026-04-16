/**
 * LLM Routing Layer
 *
 * Maps task classes to optimal model configurations.
 * Every call site specifies WHAT it's doing (task class),
 * not HOW the model should be configured.
 *
 * Task classes:
 *   extraction     → economy model, low temp (profile builder field parsing)
 *   generation     → standard model, mid temp (agent artifact generation)
 *   reasoning      → premium model, low temp (evaluator, reconciliation, score intelligence)
 *   classification → economy model, near-zero temp (follow-up questions, simple routing)
 *   summarisation  → economy model, mid temp (section compaction, digests)
 *
 * Model tiers (mapped to best available):
 *   economy  → llama-3.1-8b-instant (Groq) — fast, cheap, simple tasks
 *   standard → llama-3.3-70b-versatile (Groq) — main reasoning + generation
 *   premium  → claude-haiku-4-5 (Anthropic) — multi-step reasoning, critique, scoring
 */

import { llmChat } from './provider';
import type { ToolDefinition, LLMChatResponse } from './types';

export type TaskClass = 'extraction' | 'generation' | 'reasoning' | 'classification' | 'summarisation';
export type ModelTier = 'economy' | 'standard' | 'premium';

// Groq model IDs
const GROQ_ECONOMY  = 'llama-3.1-8b-instant';
const GROQ_STANDARD = 'llama-3.3-70b-versatile';

interface RoutingConfig {
  maxTokens: number;
  temperature: number;
  /** Override default model for this task class ('premium' uses Anthropic path) */
  model?: string;
  /** Route to Anthropic instead of Groq */
  useAnthropic?: boolean;
}

const ROUTING_TABLE: Record<TaskClass, RoutingConfig> = {
  extraction:     { maxTokens: 2000, temperature: 0.1, model: GROQ_STANDARD },
  generation:     { maxTokens: 3000, temperature: 0.55, model: GROQ_STANDARD },
  reasoning:      { maxTokens: 1200, temperature: 0.2, useAnthropic: true },
  classification: { maxTokens: 250,  temperature: 0.0, model: GROQ_ECONOMY },
  summarisation:  { maxTokens: 600,  temperature: 0.3, model: GROQ_STANDARD },
}

// Tier → task class mapping (for explicit tier-based calls)
const TIER_TO_CLASS: Record<ModelTier, TaskClass> = {
  economy:  'classification',
  standard: 'generation',
  premium:  'reasoning',
}

export interface RoutedCallParams {
  taskClass: TaskClass;
  messages: Array<{ role: string; content: string }>;
  tools?: ToolDefinition[];
  /** Override routing table defaults when needed */
  overrides?: Partial<RoutingConfig>;
}

/**
 * Route a call through the LLM provider with task-class-appropriate config.
 * Drop-in replacement for callOpenRouter + llmChat at every call site.
 */
export async function routedCall(params: RoutedCallParams): Promise<LLMChatResponse> {
  const config = ROUTING_TABLE[params.taskClass];
  const maxTokens  = params.overrides?.maxTokens  ?? config.maxTokens;
  const temperature = params.overrides?.temperature ?? config.temperature;
  const useAnthropic = params.overrides?.useAnthropic ?? config.useAnthropic ?? false;

  // Premium tasks route to Anthropic if key is configured; fall back to standard Groq
  const provider = useAnthropic && process.env.ANTHROPIC_API_KEY
    ? 'anthropic'
    : 'openrouter';

  const model = params.overrides?.model ?? config.model;

  return llmChat({
    messages: params.messages,
    maxTokens,
    temperature,
    tools: params.tools,
    model,
    // Pass provider hint via env override pattern
    ...(provider === 'anthropic' ? { _provider: 'anthropic' } : {}),
  } as Parameters<typeof llmChat>[0]);
}

/**
 * Convenience wrapper that returns only the text content (no tool call).
 * Equivalent to the old callOpenRouter() signature.
 */
export async function routedText(
  taskClass: TaskClass,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  const result = await routedCall({ taskClass, messages, overrides });
  return result.text;
}

/**
 * Tier-based routing for explicit complexity classification.
 * economy = fast/cheap; standard = default; premium = best reasoning
 */
export async function tieredText(
  tier: ModelTier,
  messages: Array<{ role: string; content: string }>,
  overrides?: Partial<RoutingConfig>,
): Promise<string> {
  return routedText(TIER_TO_CLASS[tier], messages, overrides);
}
