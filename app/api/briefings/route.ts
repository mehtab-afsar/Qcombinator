/**
 * GET /api/briefings — the founder's Executive Briefings, newest first, plus the latest
 * one per Program. Read-only: briefings are written by the rhythm (F10), never here.
 *
 * Thin by design: validate → call lib/briefings → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getBriefings, pickLatestPerProgram, attachProgramTemplateId } from '@/lib/briefings/briefings'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'
import { newModelOff } from '@/lib/api/response'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'


export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped client on purpose — RLS is the tenancy boundary (SELECT-own).
    const supabase = await createClient()

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const [rawBriefings, contract] = await Promise.all([
      getBriefings(supabase, anchorId),
      getCurrentContract(supabase, anchorId),
    ])
    // Same join /api/actions already does for `pending` via attachOwners — a briefing's own
    // programId is a database row id, not the Registry code a founder-facing UI groups/links by.
    const programs = contract ? await getProgramsForContract(supabase, contract.id) : []
    const briefings = attachProgramTemplateId(rawBriefings, programs)

    return NextResponse.json({ briefings, latest: pickLatestPerProgram(briefings) })
  } catch (err) {
    log.error('GET /api/briefings', { err })
    return NextResponse.json({ error: 'Failed to load briefings' }, { status: 500 })
  }
}
