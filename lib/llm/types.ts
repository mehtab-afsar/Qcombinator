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
  /**
   * Why generation stopped — 'end_turn', 'max_tokens', etc. Optional: providers that don't
   * report it simply omit it. 'max_tokens' means the text is TRUNCATED; callers persisting
   * model output must check this rather than storing a cut document (learned in trial run 2,
   * where all five assets were silently persisted mid-sentence).
   */
  stopReason?: string;
  /** Token counts from the provider, when it reports them. Optional: not every provider does. */
  usage?: { inputTokens: number; outputTokens: number };
  /** Concrete model id actually used (e.g. 'claude-sonnet-4-5') — present alongside usage. */
  model?: string;
}

/** Internal capability tier — provider maps this to a concrete model ID */
export type RoutingTier = 'fast' | 'capable'

/** A message content block — text, a structured tool block, or a document/image for vision. */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/webp'; data: string } }

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
    | { type: 'delta'; text: string }
    // stopReason carries the SAME truncation signal chat() already exposes (LLMChatResponse's
    // own docstring above) — a streamed asset must be checked for it exactly like a
    // non-streamed one; persisting a cut-off document was the trial-run-2 bug that rule exists
    // to prevent, and streaming must not reopen it.
    | { type: 'done'; toolCall: LLMChatResponse['toolCall']; stopReason?: string; usage?: LLMChatResponse['usage']; model?: string }
  >
}
