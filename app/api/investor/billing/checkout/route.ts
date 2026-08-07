import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createCheckoutSession } from '@/lib/billing/checkout'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const result = await createCheckoutSession({
      table: 'investor_profiles',
      userId: user.id,
      userEmail: user.email,
      premiumTierValue: 'pro',
      priceEnvVar: 'STRIPE_INVESTOR_PRO_PRICE_ID',
      returnPath: '/investor/billing',
      metadataRole: 'investor',
      notConfiguredMessage: 'Investor Pro pricing is not configured yet. Please contact support.',
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ url: result.url })
  } catch (err) {
    log.error('POST /api/investor/billing/checkout', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
