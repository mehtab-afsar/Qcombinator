/**
 * POST /api/actions/:id/direct — run one Action now, because the founder asked.
 *
 * The click half of the notice-and-ask loop: detection tells the founder something happened, and
 * this is what they press. Keeping the two apart is what preserves ADR-028 — a cycle is still fed
 * by founder activity, and a detected signal never starts work on its own.
 *
 * ⚠️ NOTHING REACHED FROM HERE CAN SEND. `directActionRun` refuses any Action declaring
 * `irreversible: true` before it calls the model, so the approval boundary stays exclusive to the
 * cycle path. This route can produce a draft; it can never produce a send.
 *
 * Thin: flag → auth → permission → anchor → run (CLAUDE.md §2). All the real decisions —
 * which Program owns the Action, whether it is in the mandate, whether the mandate is confirmed —
 * are re-derived inside directActionRun from the contract, never trusted from the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { getAnchorFounderId, getMyTeamRole, canEditAsset } from '@/lib/team/founder-permissions'
import { directActionRun, DirectActionError } from '@/lib/actions/direct'
import { AlreadyExecutedError } from '@/lib/actions/log'
import { ActionNotFoundError } from '@/lib/registry'
import { log } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  try {
    const admin = createAdminClient()

    // ⚠️ The WORKSPACE OWNER, not whichever teammate clicked. action_log rows live under the
    // owner's id, and the contract is theirs — app/api/assets/[id]/direct/route.ts anchors on
    // auth.user.id instead, which silently breaks for a teammate.
    const founderId = await getAnchorFounderId(auth.user.id, admin)
    if (!founderId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const { role } = await getMyTeamRole(auth.user.id, admin)
    if (!role || !canEditAsset(role)) {
      return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const dedupeKey = typeof body?.dedupeKey === 'string' ? body.dedupeKey.slice(0, 200) : undefined

    const entry = await directActionRun(admin, { founderId, actionId: id, dedupeKey })
    return NextResponse.json({ entry })
  } catch (err) {
    if (err instanceof AlreadyExecutedError) {
      // A double-click, or a second tab. The first run's result already exists — say so plainly
      // rather than spending a second model call to produce a near-identical one.
      return NextResponse.json({ alreadyRun: true }, { status: 200 })
    }
    if (err instanceof ActionNotFoundError) {
      // The Registry is the authority on what exists; an unknown id is a 404, not a 500.
      return NextResponse.json({ error: 'Unknown action.' }, { status: 404 })
    }
    if (err instanceof DirectActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    log.error('POST /api/actions/[id]/direct', { err })
    return NextResponse.json({ error: 'Could not run that action.' }, { status: 500 })
  }
}
