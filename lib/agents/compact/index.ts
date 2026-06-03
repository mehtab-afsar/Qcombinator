/**
 * Context compaction for agent conversations.
 *
 * When a conversation grows too long, this module summarises the oldest portion
 * using Claude Haiku and replaces it with a compact summary marker. The summary
 * preserves key decisions, metrics, and artifacts — nothing important is silently
 * dropped.
 *
 * Design:
 *  - Trigger: total char length of history > COMPACT_THRESHOLD
 *  - Compact: oldest 60% of messages → one summary assistant message
 *  - Keep: newest 40% of messages verbatim (recency matters most)
 *  - Marker: compacted messages are prepended with "[COMPACTED SUMMARY]\n"
 *    so the model understands what it represents
 *  - Circuit breaker: if the compaction LLM call fails, fall back to
 *    sliceHistoryByTokenBudget silently (never break the chat)
 */

import { llmChat } from '@/lib/llm/provider'

export interface ConversationMessage {
  role: string
  content: string
}

/** ~80k chars ≈ 20k tokens — trigger well before the 200k context limit */
const COMPACT_THRESHOLD = 80_000

/** Reserve this many chars for the newest messages (verbatim, never compacted) */
const KEEP_RECENT_CHARS = 30_000

const COMPACTION_PROMPT = `You are summarising an advisor conversation between an AI startup advisor and a founder.
Produce a concise but complete summary that preserves:
- Key decisions the founder made or committed to
- Specific numbers mentioned (MRR, burn, runway, team size, ACV, pipeline count, etc.)
- Artifacts already generated (e.g. "ICP document created", "GTM playbook generated")
- Open questions or next steps the advisor agreed to help with
- Any important context about the startup (name, stage, industry, top problems)

Write in third person. Be specific — never use vague phrases like "they discussed strategy".
Start with: "## Conversation Summary\n"
Keep to 400 words or fewer.`

function totalChars(messages: ConversationMessage[]): number {
  return messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)
}

function shouldCompact(messages: ConversationMessage[]): boolean {
  return totalChars(messages) > COMPACT_THRESHOLD
}

function splitForCompaction(messages: ConversationMessage[]): {
  toCompact: ConversationMessage[]
  toKeep: ConversationMessage[]
} {
  // Walk from the end, accumulate recent messages until we hit KEEP_RECENT_CHARS
  let recentChars = 0
  let splitIdx = messages.length
  for (let i = messages.length - 1; i >= 0; i--) {
    const len = messages[i].content?.length ?? 0
    if (recentChars + len > KEEP_RECENT_CHARS) {
      splitIdx = i + 1
      break
    }
    recentChars += len
    splitIdx = i
  }
  // Always compact at least the first half to be meaningful
  const minCompactIdx = Math.floor(messages.length / 2)
  const effectiveSplitIdx = Math.max(splitIdx, minCompactIdx)
  return {
    toCompact: messages.slice(0, effectiveSplitIdx),
    toKeep:    messages.slice(effectiveSplitIdx),
  }
}

/**
 * Compacts conversation history if it exceeds the threshold.
 * Returns the (possibly compacted) message array.
 * Never throws — falls back to simple slicing on any error.
 */
export async function compactHistoryIfNeeded(
  messages: ConversationMessage[]
): Promise<{ messages: ConversationMessage[]; compacted: boolean }> {
  if (!shouldCompact(messages)) {
    return { messages, compacted: false }
  }

  try {
    const { toCompact, toKeep } = splitForCompaction(messages)

    if (toCompact.length === 0) {
      return { messages, compacted: false }
    }

    // Build the compaction prompt with the messages to summarise
    const transcript = toCompact
      .map(m => `${m.role === 'user' ? 'Founder' : 'Advisor'}: ${m.content}`)
      .join('\n\n')

    const response = await llmChat({
      messages: [
        { role: 'user', content: `${COMPACTION_PROMPT}\n\n---\n\n${transcript}` },
      ],
      modelTier:   'fast',
      temperature: 0.2,
      maxTokens:   600,
    })

    const summary = response.text?.trim()
    if (!summary) throw new Error('Empty compaction response')

    const summaryMessage: ConversationMessage = {
      role:    'assistant',
      content: `[COMPACTED SUMMARY]\n${summary}`,
    }

    return {
      messages: [summaryMessage, ...toKeep],
      compacted: true,
    }
  } catch {
    // Circuit breaker: fall back to simple tail-slicing, never break chat
    const fallback = sliceByChars(messages, COMPACT_THRESHOLD)
    return { messages: fallback, compacted: false }
  }
}

/** Simple fallback: keep only the most recent messages within the char budget */
function sliceByChars(
  messages: ConversationMessage[],
  maxChars: number
): ConversationMessage[] {
  let total = 0
  const result: ConversationMessage[] = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const len = messages[i].content?.length ?? 0
    if (total + len > maxChars) break
    result.unshift(messages[i])
    total += len
  }
  return result
}
