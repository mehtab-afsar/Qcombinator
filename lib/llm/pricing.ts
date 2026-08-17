/**
 * Model pricing for cost estimation — USD per 1M tokens.
 * Source: Anthropic's published pricing. Update this table when Anthropic changes prices;
 * nothing keeps it in sync automatically.
 */

interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5-20251001': { inputPer1M: 1, outputPer1M: 5 },
  'claude-sonnet-4-5': { inputPer1M: 3, outputPer1M: 15 },
}

export function estimateCost(
  model: string,
  usage: { inputTokens: number; outputTokens: number },
): number | null {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return null
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPer1M +
    (usage.outputTokens / 1_000_000) * pricing.outputPer1M
  )
}
