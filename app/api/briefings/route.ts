/**
 * GET /api/briefings — the founder's Executive Briefings, newest first, plus the latest
 * one per Program. Read-only: briefings are written by the rhythm (F10), never here.
 *
 * Thin by design: validate → call lib/briefings → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { getBriefings, pickLatestPerProgram } from '@/lib/briefings/briefings'
import { log } from '@/lib/logger'

/** New model off by default (ADR-014): the route does not exist — 404, not 403. */
function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped client on purpose — RLS is the tenancy boundary (SELECT-own).
    const supabase = await createClient()
    const briefings = await getBriefings(supabase, auth.user.id)

    return NextResponse.json({ briefings, latest: pickLatestPerProgram(briefings) })
  } catch (err) {
    log.error('GET /api/briefings', { err })
    return NextResponse.json({ error: 'Failed to load briefings' }, { status: 500 })
  }
}
