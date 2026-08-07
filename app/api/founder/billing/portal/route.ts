import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { createPortalSession } from '@/lib/billing/portal'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await createPortalSession({
      table: 'founder_profiles',
      userId: auth.user.id,
      returnPath: '/founder/billing',
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ url: result.url })
  } catch (err) {
    log.error('POST /api/founder/billing/portal', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
