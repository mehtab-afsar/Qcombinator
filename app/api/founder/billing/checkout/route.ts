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
      table: 'founder_profiles',
      userId: user.id,
      userEmail: user.email,
      premiumTierValue: 'premium',
      priceEnvVar: 'STRIPE_FOUNDER_PREMIUM_PRICE_ID',
      returnPath: '/founder/billing',
      metadataRole: 'founder',
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ url: result.url })
  } catch (err) {
    log.error('POST /api/founder/billing/checkout', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
