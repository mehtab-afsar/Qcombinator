/**
 * F14 — the founder's Actions surface.
 *
 *   GET  /api/actions            → what is waiting on you
 *   POST /api/actions            → { entryId, payloadHash, decision: 'approve' | 'decline' }
 *
 * ⚠️ THIS IS THE ONE HUMAN CHECKPOINT IN THE PRODUCT, and it is deliberately NOT a gate on
 * Programs. ADR-002 removed per-cycle sign-off; ADR-004 put a checkpoint at the Connector
 * boundary only, on irreversible external effects. If this route ever grows a way to approve a
 * cycle, an Asset or a Briefing, it has rebuilt the gate the PRD deleted.
 *
 * Approving does NOT send. It records consent; execution is separate and re-reads that record.
 *
 * Thin: validate → call lib/actions → return (CLAUDE.md §2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, uuidSchema } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { pendingApprovals, attachOwners } from '@/lib/actions/log'
import { approveAction, declineAction, ApprovalError } from '@/lib/actions/approve'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'

const bodySchema = z.object({
  entryId: uuidSchema,
  decision: z.enum(['approve', 'decline']),
  /** Required for approval — the hash of the payload the founder actually saw. */
  payloadHash: z.string().trim().min(16).max(128).optional(),
})

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped: RLS (SELECT-own) is the tenancy boundary, as in /api/briefings.
    const supabase = await createClient()
    const [pending, contract] = await Promise.all([
      pendingApprovals(supabase, auth.user.id),
      getCurrentContract(supabase, auth.user.id),
    ])
    // action_log has no executive column — resolve each entry's owner against the contract's
    // own programs, the same join /founder/executive's roster needs to group actions by
    // executive. No contract yet (shouldn't happen once anything is pending, but degrade
    // honestly) just means every entry resolves to null owners rather than throwing.
    const programs = contract ? await getProgramsForContract(supabase, contract.id) : []
    return NextResponse.json({ pending: attachOwners(pending, programs) })
  } catch (err) {
    log.error('GET /api/actions', { err })
    return NextResponse.json({ error: 'Failed to load actions' }, { status: 500 })
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
    const { entryId, decision, payloadHash } = parsed.data

    // Fail closed: approving without naming the payload you saw is not an approval.
    if (decision === 'approve' && !payloadHash) {
      return NextResponse.json({ error: 'payloadHash is required to approve' }, { status: 400 })
    }

    // Service-role: action_log is read-only for authenticated by design, so a founder cannot
    // write their own approval. lib/actions/approve scopes every query to founderId explicitly,
    // because this client bypasses RLS.
    const admin = createAdminClient()
    const entry = decision === 'approve'
      ? await approveAction(admin, {
          founderId: auth.user.id, entryId, payloadHash: payloadHash!, approvedBy: auth.user.id,
        })
      : await declineAction(admin, { founderId: auth.user.id, entryId, declinedBy: auth.user.id })

    return NextResponse.json({ entry }, { status: 200 })
  } catch (err) {
    if (err instanceof ApprovalError) {
      // 404 for a missing action; 409 for every "you cannot do that to this action" case —
      // already decided, payload changed, expired, no mandate. The message is the useful part.
      const status = err.code === 'not_found' ? 404 : 409
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('POST /api/actions', { err })
    return NextResponse.json({ error: 'Failed to record your decision' }, { status: 500 })
  }
}
