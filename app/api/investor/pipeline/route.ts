import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, pipelinePostSchema, pipelinePatchSchema, uuidSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

// GET  /api/investor/pipeline           → all pipeline entries for authenticated investor
// POST /api/investor/pipeline           → add / upsert founder into pipeline
// PATCH /api/investor/pipeline          → update stage or notes
// DELETE /api/investor/pipeline?founderId → remove from pipeline

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_pipeline')
      .select('*')
      .eq('investor_user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })

    const pipelineMap: Record<string, { stage: string; notes: string | null; created_at: string; updated_at: string }> = {}
    for (const row of data ?? []) {
      pipelineMap[row.founder_user_id] = {
        stage:      row.stage,
        notes:      row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    }

    return NextResponse.json({ pipeline: data ?? [], pipelineMap })
  } catch (err) {
    log.error('GET /api/investor/pipeline', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, pipelinePostSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { founderId, stage, notes } = parsed.data

    const supabase = await createClient()
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

    if (error) return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 })

    return NextResponse.json({ entry: data })
  } catch (err) {
    log.error('POST /api/investor/pipeline', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, pipelinePatchSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { founderId, stage, notes } = parsed.data

    const updates: Record<string, unknown> = {}
    if (stage !== undefined) updates.stage = stage
    if (notes !== undefined) updates.notes = notes

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_pipeline')
      .update(updates)
      .eq('investor_user_id', user.id)
      .eq('founder_user_id', founderId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update pipeline entry' }, { status: 500 })

    return NextResponse.json({ entry: data })
  } catch (err) {
    log.error('PATCH /api/investor/pipeline', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const founderId = new URL(request.url).searchParams.get('founderId') ?? ''
    const founderIdParsed = uuidSchema.safeParse(founderId)
    if (!founderIdParsed.success) {
      return NextResponse.json({ error: 'founderId must be a valid UUID' }, { status: 400 })
    }

    const supabase = await createClient()
    await supabase
      .from('investor_pipeline')
      .delete()
      .eq('investor_user_id', user.id)
      .eq('founder_user_id', founderIdParsed.data)

    return NextResponse.json({ removed: true })
  } catch (err) {
    log.error('DELETE /api/investor/pipeline', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
