import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

const DEFAULT_CONFIG = {
  showMRR: true,
  showRunway: true,
  showBurn: true,
  showGrowth: true,
  showQScore: true,
  showHealth: true,
}

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const supabase = await createClient()
    const { data } = await supabase
      .from('investor_profiles')
      .select('portfolio_display_config')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      config: (data?.portfolio_display_config as Record<string, boolean> | null) ?? DEFAULT_CONFIG,
    })
  } catch (err) {
    log.error('GET /api/investor/portfolio-config', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const body = await request.json()
    const config = {
      showMRR:    typeof body.showMRR    === 'boolean' ? body.showMRR    : true,
      showRunway: typeof body.showRunway === 'boolean' ? body.showRunway : true,
      showBurn:   typeof body.showBurn   === 'boolean' ? body.showBurn   : true,
      showGrowth: typeof body.showGrowth === 'boolean' ? body.showGrowth : true,
      showQScore: typeof body.showQScore === 'boolean' ? body.showQScore : true,
      showHealth: typeof body.showHealth === 'boolean' ? body.showHealth : true,
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('investor_profiles')
      .update({ portfolio_display_config: config })
      .eq('user_id', user.id)

    if (error) {
      log.error('PATCH /api/investor/portfolio-config db error', { error })
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
    }

    return NextResponse.json({ config })
  } catch (err) {
    log.error('PATCH /api/investor/portfolio-config', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
