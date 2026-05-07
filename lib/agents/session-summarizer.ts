import { routedText } from '@/lib/llm/router'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function summariseAndSaveSession(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  supabase: SupabaseClient,
): Promise<void> {
  if (messages.length < 4) return

  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Founder' : 'Agent'}: ${m.content.slice(0, 400)}`)
    .join('\n')

  const summary = await routedText('summarisation', [
    {
      role: 'system',
      content: 'Summarise this advisor session in 2-4 natural sentences. Focus on: what the founder shared, what was decided or built, what was unresolved. Write as if briefing the advisor before their next session with this person. Be specific — include any numbers, decisions, or concerns that came up.',
    },
    { role: 'user', content: transcript },
  ])

  await supabase
    .from('agent_conversations')
    .update({ summary })
    .eq('id', conversationId)
}
