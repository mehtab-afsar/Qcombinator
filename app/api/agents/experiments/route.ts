import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('growth_experiments')
    .select('id, hypothesis, metric, status, channel, result, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ experiments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { hypothesis, metric, channel, status = 'backlog' } = body
  if (!hypothesis) return NextResponse.json({ error: 'hypothesis required' }, { status: 400 })

  const { data, error } = await supabase
    .from('growth_experiments')
    .insert({ user_id: user.id, hypothesis, metric, channel, status })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ experiment: data }, { status: 201 })
}
