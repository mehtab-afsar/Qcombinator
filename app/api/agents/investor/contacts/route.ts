import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET    /api/agents/investor/contacts         — list investor contacts for auth user
// POST   /api/agents/investor/contacts         — create an investor contact
// DELETE /api/agents/investor/contacts?id=xxx  — delete an investor contact

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('investor_contacts')
      .select('id, name, email, firm, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch investor contacts' }, { status: 500 })
    }

    return NextResponse.json({ contacts: data ?? [] })
  } catch (err) {
    console.error('Investor contacts GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, firm, notes } = body as {
      name: string
      email: string
      firm?: string
      notes?: string
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('investor_contacts')
      .insert({
        user_id: user.id,
        name,
        email,
        firm: firm ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create investor contact' }, { status: 500 })
    }

    return NextResponse.json({ contact: data })
  } catch (err) {
    console.error('Investor contacts POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('investor_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete investor contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Investor contacts DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
