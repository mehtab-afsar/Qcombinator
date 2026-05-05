import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !agentId) return NextResponse.json({ conversations: [] })

    const { data } = await supabase
      .from('agent_conversations')
      .select('id, title, last_message_at, message_count')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .order('last_message_at', { ascending: false })
      .limit(30)

    return NextResponse.json({ conversations: data ?? [] })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}
