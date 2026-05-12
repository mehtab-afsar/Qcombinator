/**
 * Shared types for the LLM abstraction layer.
 * Provider-agnostic.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
}

export interface LLMChatResponse {
  /** Conversational text reply (empty string if the model only returned a tool call) */
  text: string;
  /** Structured tool call, or null if no tool was invoked */
  toolCall: ToolCallResult | null;
}

/** Internal capability tier — provider maps this to a concrete model ID */
export type RoutingTier = 'fast' | 'capable'

export interface LLMProvider {
  chat(params: {
    messages: Array<{ role: string; content: string }>
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): Promise<LLMChatResponse>

  stream(params: {
    messages: Array<{ role: string; content: string }>
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): AsyncGenerator<
    { type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }
  >
}
