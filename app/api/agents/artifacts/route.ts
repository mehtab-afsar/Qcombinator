import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId        = searchParams.get('agentId')
    const conversationId = searchParams.get('conversationId')
    const limit          = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !agentId) return NextResponse.json({ artifacts: [] })

    let q = supabase
      .from('agent_artifacts')
      .select('id, artifact_type, title, content, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)

    if (conversationId) q = q.eq('conversation_id', conversationId)

    const { data: artifacts } = await q
      .order('created_at', { ascending: true })
      .limit(limit)

    return NextResponse.json({ artifacts: artifacts ?? [] })
  } catch {
    return NextResponse.json({ artifacts: [] })
  }
}
