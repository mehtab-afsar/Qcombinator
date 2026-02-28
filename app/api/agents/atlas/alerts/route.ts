import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/agents/atlas/alerts
// Returns recent price_change_alert events from agent_activity (last 30 days).

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('agent_activity')
      .select('id, description, metadata, created_at')
      .eq('user_id', user.id)
      .eq('action_type', 'price_change_alert')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    return NextResponse.json({ alerts: data ?? [] })
  } catch (err) {
    console.error('Atlas alerts GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
