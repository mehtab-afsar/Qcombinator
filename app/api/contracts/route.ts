/**
 * GET  /api/contracts — the current mandate, its Programs, and history.
 * POST /api/contracts — generate a draft, or confirm one.
 *
 * ⚠️ THERE IS NO PATCH, AND THERE MUST NEVER BE ONE. Contracts are immutable
 * (ADR-003): a change is a new epoch via POST /api/contracts/new-epoch, never an
 * edit. The database enforces this too (a trigger rejects content edits), because
 * a rule this important should not rest on the absence of a route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import {
  confirmContract,
  ContractError,
  createDraft,
  getContractHistory,
  getCurrentContract,
  getProgramsForContract,
} from '@/lib/mandate/contract'
import { startCycleIfDue } from '@/lib/rhythm/trigger'
import { log } from '@/lib/logger'
import { trackMandateDrafted, trackMandateConfirmed } from '@/lib/analytics'
import { getAnchorFounderId, getMyTeamRole } from '@/lib/team/founder-permissions'

/**
 * Whole days between signup and now, for activation latency.
 *
 * Computed here rather than joined in PostHog later: the founder's signup date lives in
 * auth.users, and "we'll correlate it at analysis time" is the kind of step nobody performs
 * under deadline. Null when the timestamp is missing or unparseable — never a guessed 0, which
 * would read as "activated the same day".
 */
function daysSince(iso: string | undefined): number | null {
  if (!iso) return null
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
}

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft') }),
  z.object({ action: z.literal('confirm'), contractId: z.string().uuid() }),
])

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped client: RLS is the tenancy boundary, so the database enforces
    // isolation rather than this route remembering to.
    const supabase = await createClient()

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const contract = await getCurrentContract(supabase, anchorId)
    const [history, programs] = await Promise.all([
      getContractHistory(supabase, anchorId),
      contract ? getProgramsForContract(supabase, contract.id) : Promise.resolve([]),
    ])

    return NextResponse.json({ contract, programs, history })
  } catch (err) {
    log.error('GET /api/contracts', { err })
    return NextResponse.json({ error: 'Failed to load mandate' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()

    // Drafting or confirming the Mandate stays a single point of accountability even on a
    // multi-founder team — it defines which Programs are allowed to run at all, and two
    // co-founders racing to each confirm a different mandate is a real failure mode with only
    // one company underneath it. Owner-only, not owner-or-admin (deliberately narrower than
    // canInviteMembers). RLS's own WITH CHECK (auth.uid() = founder_id) would reject a non-owner's
    // write anyway once contracts anchor to the owner — gating here first means a clean 403
    // instead of a confusing Postgres rejection.
    const { role } = await getMyTeamRole(auth.user.id, supabase)
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the workspace owner can change the mandate' }, { status: 403 })
    }

    if (parsed.data.action === 'draft') {
      const contract = await createDraft(supabase, auth.user.id)
      trackMandateDrafted(auth.user.id, {
        epoch: contract.epoch,
        programs: contract.activePrograms?.length ?? 0,
      })
      return NextResponse.json({ contract }, { status: 201 })
    }

    // Confirming is the moment the mandate becomes real and Programs start
    // running. Atomic in Postgres — see confirm_executive_contract.
    const result = await confirmContract(supabase, auth.user.id, parsed.data.contractId)

    // F09 Activation (PRD §4, "the spine") — confirming must produce a real, watchable cycle
    // immediately, not a "Run now" button and a silent room. startCycleIfDue only does a cheap
    // DB read+insert before handing the actual LLM work off to Next's after(), so this response
    // stays fast; by the time it returns, the run row already exists at status:'running' for
    // the Activation screen's very first poll to see.
    await startCycleIfDue(createAdminClient(), {
      founderId: auth.user.id,
      contractId: result.contract.id,
    })

    // ACTIVATION. The one confirmation in the product, and the denominator of every retention
    // question that follows — a founder who never reaches here never entered the loop at all.
    trackMandateConfirmed(auth.user.id, {
      epoch: result.contract.epoch,
      programs: result.contract.activePrograms?.length ?? 0,
      daysSinceSignup: daysSince(auth.user.created_at),
    })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    // ContractError is expected disagreement — an incomplete strategy, a lost
    // race, confirming something already confirmed. The founder should read it,
    // not have it buried in a 500.
    if (err instanceof ContractError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/contracts', { err })
    return NextResponse.json({ error: 'Failed to update mandate' }, { status: 500 })
  }
}
