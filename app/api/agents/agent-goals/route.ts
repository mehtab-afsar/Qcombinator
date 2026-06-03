/**
 * GET /api/agents/agent-goals
 * Returns the current goal status for each agent for the authenticated founder.
 * Used by the dashboard "Agent Watch" section.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const supabase = await createClient()

    const { data: goals } = await supabase
      .from('agent_goals')
      .select('agent_id, goal, status, reason, suggested_action, last_evaluated')
      .eq('user_id', auth.user.id)
      .order('agent_id', { ascending: true })

    return NextResponse.json(
      { goals: goals ?? [] },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    log.error('GET /api/agents/agent-goals', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
