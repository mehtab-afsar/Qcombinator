/**
 * Agent Chat Service — loads conversation history and artifacts from Supabase
 */

import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ArtifactRecord {
  id: string
  artifact_type: string
  title: string
  content: Record<string, unknown>
}

export interface AgentChatHistory {
  userId: string
  conversationId: string | null
  messages: ChatMessage[]
  artifacts: ArtifactRecord[]
}

export async function loadAgentChatHistory(
  agentId: string,
  targetArtifactId: string | null,
): Promise<AgentChatHistory | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Load most recent conversation
  const { data: conv } = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('agent_id', agentId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let messages: ChatMessage[] = []
  let conversationId: string | null = null

  if (conv) {
    conversationId = conv.id
    const { data: msgs } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    messages = (msgs ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  }

  // Load artifacts
  let artifacts: ArtifactRecord[] | null = null

  if (targetArtifactId) {
    const { data: target } = await supabase
      .from('agent_artifacts')
      .select('id, artifact_type, title, content')
      .eq('id', targetArtifactId)
      .single()
    if (target) {
      const { data: siblings } = await supabase
        .from('agent_artifacts')
        .select('id, artifact_type, title, content')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .eq('artifact_type', target.artifact_type)
        .order('created_at', { ascending: true })
      artifacts = siblings ?? [target]
    }
  }

  if (!artifacts && conversationId) {
    const { data } = await supabase
      .from('agent_artifacts')
      .select('id, artifact_type, title, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    artifacts = data
  }

  return {
    userId: user.id,
    conversationId,
    messages,
    artifacts: (artifacts ?? []).map(a => ({ ...a, content: a.content as Record<string, unknown> })),
  }
}
