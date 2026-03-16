/**
 * Conversations data access layer.
 * Wraps agent_conversations and agent_messages tables.
 */

import { createClient } from '@/lib/supabase/server';

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_conversations')
    .select('id, user_id, agent_id, title, last_message_at, message_count, created_at')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Conversation | null;
}

export async function getHistory(
  userId: string,
  agentId: string,
  limit = 20,
): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_conversations')
    .select('id, user_id, agent_id, title, last_message_at, message_count, created_at')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[data/conversations] getHistory error:', error.message);
    return [];
  }
  return (data ?? []) as Conversation[];
}

export async function saveMessage(
  conversationId: string,
  role: Message['role'],
  content: string,
): Promise<Message | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({ conversation_id: conversationId, role, content })
    .select('id, conversation_id, role, content, created_at')
    .single();

  if (error) {
    console.error('[data/conversations] saveMessage error:', error.message);
    return null;
  }
  return data as Message | null;
}
