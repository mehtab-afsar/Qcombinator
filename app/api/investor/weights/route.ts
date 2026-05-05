import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, weightsSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

// GET /api/investor/weights — return investor's custom dimension weights
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = await createClient()
    const { data } = await supabase
      .from('investor_parameter_weights')
      .select('weight_p1, weight_p2, weight_p3, weight_p4, weight_p5, weight_p6')
      .eq('investor_user_id', user.id)
      .single()

    return NextResponse.json({
      weights: data ?? {
        weight_p1: 20, weight_p2: 17, weight_p3: 18,
        weight_p4: 15, weight_p5: 12, weight_p6: 18,
      },
    })
  } catch (err) {
    log.error('GET /api/investor/weights', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/investor/weights — upsert investor's custom dimension weights
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, weightsSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase
      .from('investor_parameter_weights')
      .upsert({
        investor_user_id: user.id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'investor_user_id' })

    if (error) {
      log.error('[investor/weights] upsert failed', { err: error, userId: user.id })
      return NextResponse.json({ error: 'Failed to save weights' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('POST /api/investor/weights', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
