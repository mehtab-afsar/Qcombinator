/**
 * GET /api/connectors/posthog/trends?q=... — query the founder's connected PostHog analytics.
 *
 * ⚠️ FOUNDER-TRIGGERED ONLY, ON PURPOSE — same rule as `gmail_read/search`. Called from a UI
 * action, never from the Operating Rhythm or a Program. P003/P006 (the programs this would
 * eventually feed) don't exist yet, so there's no autonomous consumer to wire up here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { resolveGrant } from '@/lib/connectors/grants'
import { queryPostHogTrends } from '@/lib/connectors/posthog/connector'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const query = req.nextUrl.searchParams.get('q')
    if (!query) return NextResponse.json({ error: 'q is required' }, { status: 400 })

    const grant = await resolveGrant(createAdminClient(), auth.user.id, 'posthog')
    const result = await queryPostHogTrends(grant, query)

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ConnectorError) {
      const status = err.code === 'not_connected' ? 404 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('GET /api/connectors/posthog/trends', { err })
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}
