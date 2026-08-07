import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth, verifyInvestor } from '@/lib/auth/verify'
import { parseBody, portfolioConfigPatchSchema } from '@/lib/api/validate'
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
    const auth = await verifyInvestor(createAdminClient())
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(request, portfolioConfigPatchSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const config = { ...DEFAULT_CONFIG, ...parsed.data }

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
