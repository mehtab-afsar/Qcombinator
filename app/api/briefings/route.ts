/**
 * GET /api/briefings — the founder's Executive Briefings, newest first, plus the latest
 * one per Program. Read-only: briefings are written by the rhythm (F10), never here.
 *
 * Thin by design: validate → call lib/briefings → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getBriefings, pickLatestPerProgram } from '@/lib/briefings/briefings'
import { log } from '@/lib/logger'
import { newModelOff } from '@/lib/api/response'


export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
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
