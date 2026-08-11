/**
 * GET /api/connectors/gmail_read/search?q=... — search the founder's connected inbox.
 *
 * ⚠️ FOUNDER-TRIGGERED ONLY, ON PURPOSE. This is the one deliberately-built consumer of the
 * gmail_read connector (see `lib/connectors/gmail/read.ts`'s scope warning) — called from a UI
 * action, never from the Operating Rhythm or a Program. Wiring this into autonomous execution is
 * a distinct product decision (ADR-028's "autonomous external signal"), not something this route
 * should do quietly.
 *
 * Not under `[provider]/` like the connect/disconnect routes — this is gmail_read-specific
 * behavior (a search query), not a generic connector operation every provider shares.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { resolveGrant } from '@/lib/connectors/grants'
import { searchGmailThreads } from '@/lib/connectors/gmail/read'
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

    const grant = await resolveGrant(createAdminClient(), auth.user.id, 'gmail_read')
    const threads = await searchGmailThreads(grant, query)

    return NextResponse.json({ threads })
  } catch (err) {
    if (err instanceof ConnectorError) {
      const status = err.code === 'not_connected' ? 404 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('GET /api/connectors/gmail_read/search', { err })
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
