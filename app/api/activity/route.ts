/**
 * GET /api/activity?executiveId=growth — one executive's Activity Log (CANVAS_SPEC §4.5).
 *
 * Thin: validate -> call lib/activity/log.ts -> return (CLAUDE.md §2). RLS-scoped client, same
 * as GET /api/rhythm/run — a founder only ever reads their own rows.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getActivityForExecutive } from '@/lib/activity/log'
import { log } from '@/lib/logger'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'

const querySchema = z.object({ executiveId: z.string().trim().min(1).max(40) })

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = querySchema.safeParse({
      executiveId: new URL(request.url).searchParams.get('executiveId'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'executiveId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const contract = await getCurrentContract(supabase, anchorId)
    if (!contract || contract.status !== 'confirmed') {
      return NextResponse.json({ activity: [] }) // no mandate yet — nothing to have done
    }

    const programs = await getProgramsForContract(supabase, contract.id)
    const activity = await getActivityForExecutive(supabase, anchorId, parsed.data.executiveId, programs)

    return NextResponse.json({ activity })
  } catch (err) {
    log.error('GET /api/activity', { err })
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
