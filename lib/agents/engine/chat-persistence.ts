/**
 * Chat Persistence — saves a completed chat turn to Supabase.
 *
 * Extracted from app/api/agents/chat/route.ts to eliminate the identical
 * block duplicated across the streaming and non-streaming code paths.
 *
 * Returns the resolved conversationId (newly created or existing).
 * Never throws — all DB errors are caught and passed to onError.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { summariseAndSaveSession } from '@/lib/agents/session-summarizer'
import { updateAgentMemory } from '@/lib/agents/memory-updater'
import { inferIterationAndAlignmentFromMessage } from '@/lib/agents/patel-indicator-updater'
import type { PatelScores } from '@/lib/constants/patel-indicators'
import { log } from '@/lib/logger'

export interface PersistChatParams {
  userId: string
  agentId: string
  message: string
  chatReply: string
  existingConversationId: string | null | undefined
  conversationHistory: Array<{ role: string; content: string }> | undefined
  artifactId: string | null | undefined
  patelRawScores: PatelScores | undefined
  supabase: SupabaseClient
  onPersistError?: (conversationId: string | null) => void
}

export async function persistChatTurn(params: PersistChatParams): Promise<string | null> {
  const {
    userId, agentId, message, chatReply,
    existingConversationId, conversationHistory,
    artifactId, patelRawScores, supabase, onPersistError,
  } = params

  let conversationId = existingConversationId ?? null

  try {
    if (!conversationId) {
      const { data: conv } = await supabase
        .from('agent_conversations')
        .insert({
          user_id:         userId,
          agent_id:        agentId,
          title:           message.slice(0, 60),
          last_message_at: new Date().toISOString(),
          message_count:   1,
        })
        .select('id')
        .single()
      conversationId = conv?.id ?? null

      // Link artifact to the newly created conversation
      if (artifactId && conversationId) {
        await supabase.from('agent_artifacts')
          .update({ conversation_id: conversationId })
          .eq('id', artifactId)
      }
    } else {
      await supabase
        .from('agent_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count:   (conversationHistory?.length ?? 0) + 2,
        })
        .eq('id', conversationId)
    }

    if (conversationId) {
      await supabase.from('agent_messages').insert({ conversation_id: conversationId, role: 'user',      content: message })
      await supabase.from('agent_messages').insert({ conversation_id: conversationId, role: 'assistant', content: chatReply })
    }
  } catch (err) {
    log.error('Conversation persistence failed', { conversationId, userId, err: err instanceof Error ? err.message : err })
    onPersistError?.(conversationId)
  }

  // Fire-and-forget background enrichments — never block the response
  const allMsgs = [
    ...(conversationHistory ?? []),
    { role: 'user',      content: message },
    { role: 'assistant', content: chatReply },
  ]

  if (conversationId) void summariseAndSaveSession(conversationId, allMsgs, supabase)
    .catch(err => log.warn('[memory] session summary failed', { userId, agentId, err: (err as Error)?.message }))
  void updateAgentMemory(userId, agentId, allMsgs, supabase)
    .catch(err => log.warn('[memory] agent memory update failed', { userId, agentId, err: (err as Error)?.message }))

  // Patel: infer P1.4 (iteration) and P1.5 (team alignment) from this message
  if (agentId === 'patel' && patelRawScores?.['icp.specificity'] &&
      (!patelRawScores['icp.iteration'] || !patelRawScores['icp.team_alignment']) &&
      message.length > 20) {
    void inferIterationAndAlignmentFromMessage(userId, message, patelRawScores, supabase)
      .catch(err => log.warn('[patel] indicator inference failed', { userId, err: (err as Error)?.message }))
  }

  return conversationId
}
