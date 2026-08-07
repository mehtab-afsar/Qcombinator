import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { computeBillingStatus } from '@/lib/billing/status'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const status = await computeBillingStatus({
      table: 'investor_profiles',
      userId: auth.user.id,
      includeUsage: true,
    })

    return NextResponse.json(status)
  } catch (err) {
    log.error('GET /api/investor/billing/status', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
