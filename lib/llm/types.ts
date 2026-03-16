/**
 * Shared types for the LLM abstraction layer.
 * Provider-agnostic — used by both OpenRouter and Anthropic paths.
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
