import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { ensurePublicPortfolio } from '@/features/founder/services/public-portfolio.service'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const admin = createAdminClient()
    const slug = await ensurePublicPortfolio(auth.user.id, admin)

    return NextResponse.json({ slug })
  } catch (err) {
    log.error('POST /api/founder/publish-portfolio', err)
    return NextResponse.json({ error: 'Failed to publish portfolio' }, { status: 500 })
  }
}
