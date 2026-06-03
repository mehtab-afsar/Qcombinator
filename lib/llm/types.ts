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
  /** Native tool_use block ID from Anthropic — required for proper tool_result threading */
  id: string;
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

/** A message content block — either plain text or a structured tool_use / tool_result block */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

/** Chat message — content may be a plain string or an array of content blocks */
export interface ChatMessage {
  role: string
  content: string | ContentBlock[]
}

export interface LLMProvider {
  chat(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): Promise<LLMChatResponse>

  stream(params: {
    messages: ChatMessage[]
    modelTier: RoutingTier
    maxTokens: number
    temperature: number
    tools?: ToolDefinition[]
  }): AsyncGenerator<
    { type: 'delta'; text: string } | { type: 'done'; toolCall: LLMChatResponse['toolCall'] }
  >
}
