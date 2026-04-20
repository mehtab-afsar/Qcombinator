import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data } = await admin
      .from('investor_profiles')
      .select('subscription_tier, subscription_status, subscription_current_period_end')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      subscriptionTier:   (data?.subscription_tier as string) ?? 'free',
      subscriptionStatus: (data?.subscription_status as string) ?? null,
      periodEnd:          (data?.subscription_current_period_end as string) ?? null,
    })
  } catch (err) {
    log.error('GET /api/investor/billing/status', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
