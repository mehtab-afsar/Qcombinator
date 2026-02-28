import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cross-agent context bus
// GET  /api/agents/context?since=ISO_DATE&agentId=xxx
//   → returns recent cross-agent events relevant to the requesting agent
// POST /api/agents/context
//   → fires a cross-agent event (stored in agent_activity with metadata.crossAgent=true)

interface ContextEvent {
  id: string
  agent_id: string
  action_type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

// Map: action_type → which agents care about this event
const SUBSCRIBER_MAP: Record<string, string[]> = {
  // When Felix updates real metrics (Stripe sync), Sage's investor update needs refreshing
  stripe_sync:            ['sage', 'felix'],
  invoice_created:        ['susi', 'felix'],
  // When Patel sends outreach, Susi should know about the new contacts
  send_outreach:          ['susi', 'patel'],
  // When Harper posts a job, Atlas should check if competitors are hiring too
  job_posting_prepared:    ['atlas', 'harper'],
  competitor_hiring_cue:   ['atlas'],
  // When Nova gets PMF survey responses, sage and patel should know
  survey_responses_ready: ['sage', 'patel', 'nova'],
  // When Felix updates MRR, dashboard and sage auto-refresh
  mrr_updated:            ['sage', 'felix', 'dashboard'],
  // When Atlas finds competitor job signals, harper should see them
  job_signal_analysis:    ['harper', 'atlas'],
  // When Leo generates data room, sage investor update should reference it
  data_room_generated:    ['sage', 'leo'],
  // When site is deployed, patel should show live URL
  site_deployed:          ['patel', 'maya'],
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const agentId = url.searchParams.get('agentId') // which agent is asking
    const since   = url.searchParams.get('since')    // ISO date — only return events after this
    const limit   = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)

    // Find action_types this agent cares about
    const relevantTypes = agentId
      ? Object.entries(SUBSCRIBER_MAP)
          .filter(([, subscribers]) => subscribers.includes(agentId))
          .map(([type]) => type)
      : null // null = return all cross-agent events

    let query = supabase
      .from('agent_activity')
      .select('id, agent_id, action_type, description, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gt('created_at', since)
    }
    if (relevantTypes && relevantTypes.length > 0) {
      query = query.in('action_type', relevantTypes)
    }

    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    // Group by source agent for easy consumption
    const byAgent: Record<string, ContextEvent[]> = {}
    for (const e of (events ?? [])) {
      if (!byAgent[e.agent_id]) byAgent[e.agent_id] = []
      byAgent[e.agent_id].push(e as ContextEvent)
    }

    // Build a natural-language summary of relevant cross-agent updates
    const summaries: string[] = []
    for (const e of (events ?? []).slice(0, 5)) {
      summaries.push(`${(e.agent_id as string).charAt(0).toUpperCase() + (e.agent_id as string).slice(1)} ${e.description.toLowerCase()} · ${new Date(e.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
    }

    return NextResponse.json({
      events: events ?? [],
      byAgent,
      summaries,
      subscriberMap: agentId ? SUBSCRIBER_MAP : undefined,
    })
  } catch (err) {
    console.error('Context bus GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — manually fire a context event (for client-side triggers)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId, actionType, description, metadata = {} } = await request.json()
    if (!agentId || !actionType || !description) {
      return NextResponse.json({ error: 'agentId, actionType, and description are required' }, { status: 400 })
    }

    const { data, error } = await supabase.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    agentId,
      action_type: actionType,
      description,
      metadata:    { ...metadata, crossAgent: true },
    }).select('id').single()

    if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

    // Return which agents should be notified
    const notify = SUBSCRIBER_MAP[actionType] ?? []
    return NextResponse.json({ id: (data as { id: string }).id, notify })
  } catch (err) {
    console.error('Context bus POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
