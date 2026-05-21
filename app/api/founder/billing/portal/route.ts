import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('founder_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id as string,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/founder/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error('POST /api/founder/billing/portal', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
