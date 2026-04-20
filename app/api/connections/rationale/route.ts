import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { generateMatchRationale } from '@/features/matching/services/match-rationale'

/**
 * POST /api/connections/rationale
 * Body: MatchRationaleInput
 * Returns: { rationale: string }
 *
 * Called on-demand when founder expands an investor card.
 * Caches result in connection_requests.match_metadata when a connection is saved.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await req.json()
    const rationale = await generateMatchRationale(body)
    return NextResponse.json({ rationale })
  } catch (err) {
    log.error('POST /api/connections/rationale', { err })
    return NextResponse.json({ rationale: '' }, { status: 200 })
  }
}
