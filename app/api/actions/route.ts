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
import { pendingApprovals, latestPerActionForFounder, attachOwners } from '@/lib/actions/log'
import { approveAction, declineAction, ApprovalError } from '@/lib/actions/approve'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { getProgram, getAction } from '@/lib/registry'
import { log } from '@/lib/logger'
import { getAnchorFounderId, getMyTeamRole, canApproveAction } from '@/lib/team/founder-permissions'

/** A reversible internal Action's own analysis, generated for real by lib/actions/generate.ts
 *  but — until this — discarded the moment it was written; never a recipient/subject/body,
 *  which action_log never stores at all (redacted at write time, see payloadMetadata).
 *  Exported (pure, no IO) so this reads-from-`result` rule is unit-tested directly, matching
 *  attachOwners (lib/actions/log.ts) rather than only reachable through the full GET handler. */
export function resultSummary(result: Record<string, unknown> | null | undefined): string | null {
  const summary = result?.summary
  return typeof summary === 'string' && summary.trim() ? summary : null
}

/**
 * Stage 5 — the honest action surface (FU-009). ActionsPanel used to render nothing at all once
 * nothing was pending, which hid the 4 internal, already-completed actions entirely — not a
 * missing feature, a defect: a founder had no way to see the team had done that work. This is
 * every Action across the founder's active Programs, not just what's waiting on them, degrading
 * an action that has never run to 'never_run' rather than omitting it.
 */
async function allActionsForFounder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  founderId: string,
  activePrograms: readonly string[],
) {
  const actionIds = [...new Set(
    activePrograms.flatMap(templateId => {
      try { return getProgram(templateId).actions } catch { return [] }
    }),
  )]
  if (actionIds.length === 0) return []

  const latest = await latestPerActionForFounder(supabase, founderId)
  const latestById = new Map(latest.map(e => [e.actionId, e]))

  return actionIds.map(actionId => {
    const def = getAction(actionId)
    const entry = latestById.get(actionId) ?? null
    const ownerTemplateId = activePrograms.find(id => {
      try { return getProgram(id).actions.includes(actionId) } catch { return false }
    })
    return {
      actionId,
      name: def.name,
      irreversible: def.irreversible,
      executiveId: ownerTemplateId ? getProgram(ownerTemplateId).owner : null,
      status: entry?.status ?? ('never_run' as const),
      provider: entry?.provider ?? null,
      createdAt: entry?.createdAt ?? null,
      summary: resultSummary(entry?.result),
    }
  })
}

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

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const [pending, contract] = await Promise.all([
      pendingApprovals(supabase, anchorId),
      getCurrentContract(supabase, anchorId),
    ])
    // action_log has no executive column — resolve each entry's owner against the contract's
    // own programs, the same join /founder/executive's roster needs to group actions by
    // executive. No contract yet (shouldn't happen once anything is pending, but degrade
    // honestly) just means every entry resolves to null owners rather than throwing.
    const programs = contract ? await getProgramsForContract(supabase, contract.id) : []
    const all = contract?.status === 'confirmed'
      ? await allActionsForFounder(supabase, anchorId, contract.activePrograms)
      : []
    return NextResponse.json({ pending: attachOwners(pending, programs), all })
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

    // Irreversible external Actions (send/publish/spend) stay owner/admin-only — no versioned
    // undo like Assets have, so this is the narrower bar (canApproveAction, not canEditAsset).
    const { role } = await getMyTeamRole(auth.user.id, admin)
    if (!role || !canApproveAction(role)) {
      return NextResponse.json({ error: 'Not authorized to approve or decline actions' }, { status: 403 })
    }

    // action_log rows live under the workspace owner's founder_id (see getAnchorFounderId) —
    // a non-owner approver querying by their own auth.user.id would find nothing to approve.
    // approvedBy/declinedBy stay the real individual: who acted is not the same fact as whose
    // data it is.
    const anchorId = await getAnchorFounderId(auth.user.id, admin)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const entry = decision === 'approve'
      ? await approveAction(admin, {
          founderId: anchorId, entryId, payloadHash: payloadHash!, approvedBy: auth.user.id,
        })
      : await declineAction(admin, { founderId: anchorId, entryId, declinedBy: auth.user.id })

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
