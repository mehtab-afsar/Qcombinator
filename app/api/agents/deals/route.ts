import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STAGES = ['lead', 'qualified', 'proposal', 'negotiating', 'won', 'lost'] as const
type Stage = typeof VALID_STAGES[number]

// GET  /api/agents/deals — list all deals for the authenticated founder
// POST /api/agents/deals — create a new deal
// PATCH /api/agents/deals — update a deal (stage, notes, next_action etc.)
// DELETE /api/agents/deals?id=xxx — delete a deal

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('deals')
      .select('id, company, contact_name, contact_email, contact_title, stage, value, notes, next_action, next_action_date, source, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })

    // Group by stage
    const grouped: Record<Stage, typeof data> = {
      lead: [], qualified: [], proposal: [], negotiating: [], won: [], lost: [],
    }
    for (const deal of data ?? []) {
      const s = deal.stage as Stage
      if (grouped[s]) grouped[s].push(deal)
    }

    return NextResponse.json({ deals: data ?? [], grouped })
  } catch (err) {
    console.error('Deals GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      company, contact_name, contact_email, contact_title,
      stage = 'lead', value, notes, next_action, next_action_date, source = 'manual',
    } = body

    if (!company) return NextResponse.json({ error: 'company is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: user.id,
        company, contact_name, contact_email, contact_title,
        stage: VALID_STAGES.includes(stage) ? stage : 'lead',
        value, notes, next_action, next_action_date, source,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    return NextResponse.json({ deal: data })
  } catch (err) {
    console.error('Deals POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Only allow valid stage values
    if (updates.stage && !VALID_STAGES.includes(updates.stage)) delete updates.stage

    const { data, error } = await supabase
      .from('deals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
    return NextResponse.json({ deal: data })
  } catch (err) {
    console.error('Deals PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const id  = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Deals DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
