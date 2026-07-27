/**
 * POST /api/contracts/new-epoch — issue a new mandate.
 *
 * The ONLY way to change direction once a contract is confirmed (ADR-003). The
 * confirmed contract is superseded and retained; a new draft opens the next
 * epoch. Nothing is edited, nothing is deleted.
 *
 * Its own route rather than an action on POST /api/contracts because it is its
 * own decision — the founder is ending one operating epoch and starting another.
 * PRD §9 names it exactly this. There is deliberately no PATCH anywhere.
 *
 * No approval gate: the founder redirects by issuing a new mandate, and the next
 * rhythm cycle simply uses it. No waiting state (ADR-002).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { ContractError, newEpoch } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'
import { newModelOff } from '@/lib/api/response'

export async function POST(): Promise<NextResponse> {
  // Inert until the new model is on — a stray call can't spend anything.
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()
    const contract = await newEpoch(supabase, auth.user.id)

    return NextResponse.json({ contract }, { status: 201 })
  } catch (err) {
    if (err instanceof ContractError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/contracts/new-epoch', { err })
    return NextResponse.json({ error: 'Failed to issue a new mandate' }, { status: 500 })
  }
}
