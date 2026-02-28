import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET  /api/agents/pending         — list pending actions (status=pending)
// POST /api/agents/pending         — create a new pending action
// PATCH /api/agents/pending        — approve or reject an action

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('pending_actions')
      .select('id, agent_id, action_type, title, summary, payload, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ actions: data ?? [] })
  } catch (err) {
    console.error('Pending actions GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId, actionType, title, summary, payload } = await request.json()
    if (!agentId || !actionType || !title) {
      return NextResponse.json({ error: 'agentId, actionType, title required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pending_actions')
      .insert({ user_id: user.id, agent_id: agentId, action_type: actionType, title, summary, payload: payload ?? {} })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Pending actions POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { actionId, decision } = await request.json() // decision: 'approved' | 'rejected'
    if (!actionId || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'actionId and decision (approved|rejected) required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pending_actions')
      .update({ status: decision, reviewed_at: new Date().toISOString() })
      .eq('id', actionId)
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pending actions PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
