import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !agentId) return NextResponse.json({ artifacts: [] })

    const { data: artifacts } = await supabase
      .from('agent_artifacts')
      .select('id, artifact_type, title, content, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ artifacts: artifacts ?? [] })
  } catch {
    return NextResponse.json({ artifacts: [] })
  }
}
