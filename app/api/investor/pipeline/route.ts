import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET  /api/investor/pipeline           → all pipeline entries for authenticated investor
// POST /api/investor/pipeline           → add / upsert founder into pipeline { founderId, stage, notes? }
// PATCH /api/investor/pipeline          → update stage or notes { founderId, stage?, notes? }
// DELETE /api/investor/pipeline?founderId → remove from pipeline

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('investor_pipeline')
      .select('*')
      .eq('investor_user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Build a quick map for easy lookup
    const pipelineMap: Record<string, { stage: string; notes: string | null; created_at: string; updated_at: string }> = {}
    for (const row of data ?? []) {
      pipelineMap[row.founder_user_id] = {
        stage: row.stage,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    }

    return NextResponse.json({ pipeline: data ?? [], pipelineMap })
  } catch (err) {
    console.error('Pipeline GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { founderId, stage = 'watching', notes } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId is required' }, { status: 400 })

    const validStages = ['watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed']
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('investor_pipeline')
      .upsert({
        investor_user_id: user.id,
        founder_user_id:  founderId,
        stage,
        ...(notes !== undefined ? { notes } : {}),
      }, { onConflict: 'investor_user_id,founder_user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ entry: data })
  } catch (err) {
    console.error('Pipeline POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { founderId, stage, notes } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (stage !== undefined) updates.stage = stage
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await supabase
      .from('investor_pipeline')
      .update(updates)
      .eq('investor_user_id', user.id)
      .eq('founder_user_id', founderId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ entry: data })
  } catch (err) {
    console.error('Pipeline PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const founderId = new URL(request.url).searchParams.get('founderId')
    if (!founderId) return NextResponse.json({ error: 'founderId is required' }, { status: 400 })

    await supabase
      .from('investor_pipeline')
      .delete()
      .eq('investor_user_id', user.id)
      .eq('founder_user_id', founderId)

    return NextResponse.json({ removed: true })
  } catch (err) {
    console.error('Pipeline DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
