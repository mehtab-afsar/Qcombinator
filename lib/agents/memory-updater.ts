import { routedText } from '@/lib/llm/router'
import type { SupabaseClient } from '@supabase/supabase-js'

function getTier(sessions: number): string {
  if (sessions <= 1) return 'stranger'
  if (sessions <= 5) return 'acquainted'
  if (sessions <= 15) return 'familiar'
  return 'trusted'
}

export async function updateAgentMemory(
  userId: string,
  agentId: string,
  messages: Array<{ role: string; content: string }>,
  supabase: SupabaseClient,
): Promise<void> {
  if (messages.length < 2) return

  const { data: existing } = await supabase
    .from('agent_memory')
    .select('session_count, key_facts')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single()

  const sessions = (existing?.session_count ?? 0) + 1
  const tier = getTier(sessions)

  const transcript = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.slice(0, 300))
    .join('\n')

  const key_facts = await routedText('summarisation', [
    {
      role: 'system',
      content: `You are updating a memory file for an AI startup advisor.
Current memory: ${existing?.key_facts ?? 'None yet — this is the first session.'}
Read the new session transcript and write a single updated prose paragraph (max 200 words) summarising what the advisor knows about this founder. Include: their business context, key challenges mentioned, decisions made, communication style, what they care about most. Merge new facts with existing memory — do not drop important context. Write naturally as if briefing a colleague.`,
    },
    { role: 'user', content: transcript },
  ])

  await supabase
    .from('agent_memory')
    .upsert(
      {
        user_id: userId,
        agent_id: agentId,
        session_count: sessions,
        relationship_tier: tier,
        key_facts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,agent_id' },
    )
}
