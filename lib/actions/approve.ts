/**
 * F14 — approving or declining a prepared Action.
 *
 * **This is the one human checkpoint in the entire product** (ADR-004). Everything else runs
 * unattended within the mandate; this is the line an irreversible external effect cannot cross
 * without the founder.
 *
 * The checks below are all fail-closed, and each exists because of a specific way this goes
 * wrong. None is defensive padding — read the reason before removing one.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAction } from '@/lib/registry'
import { getCurrentContract } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'
import { trackActionApproved, trackActionDeclined } from '@/lib/analytics'
import { recordAttempt, type ActionLogEntry } from './log'

/**
 * How long an approval stays valid.
 *
 * An approval is a statement about a payload AND a moment: "yes, email these five people about
 * this, today". A week later the context has moved and the founder would want to look again.
 * Judgement, not evidence — worth tuning once the pilot shows how fast founders actually act.
 */
export const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

export class ApprovalError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApprovalError'
    this.code = code
  }
}

export interface ApproveArgs {
  founderId: string
  /** The action_log row the founder is acting on. */
  entryId: string
  /**
   * The hash of the payload the founder actually saw.
   *
   * Sent by the client and compared against the stored one — so an approval issued against a
   * screen showing payload A can never authorise payload B. Without this, "approved" would mean
   * "someone clicked yes on this action id once", which is not what the DoD requires.
   */
  payloadHash: string
  approvedBy: string
}

/** The stored entry, as the approval path needs to see it. */
interface StoredEntry {
  id: string
  founder_id: string
  program_id: string | null
  execution_id: string | null
  action_id: string
  provider: string | null
  status: string
  payload_hash: string | null
  created_at: string
}

async function loadPending(
  admin: SupabaseClient,
  founderId: string,
  entryId: string,
): Promise<StoredEntry> {
  const { data, error } = await admin
    .from('action_log')
    .select('id, founder_id, program_id, execution_id, action_id, provider, status, payload_hash, created_at')
    .eq('id', entryId)
    // Scoped to the founder in the QUERY, not checked afterwards: this runs on a service-role
    // client, which bypasses RLS, so the tenancy boundary has to be here explicitly.
    .eq('founder_id', founderId)
    .maybeSingle()

  if (error) throw new ApprovalError('read_failed', `Could not read the action: ${error.message}`)
  if (!data) throw new ApprovalError('not_found', 'That action does not exist.')
  return data as StoredEntry
}

/**
 * Approve a prepared Action and record the approval.
 *
 * ⚠️ Approving does NOT execute. It records consent; execution is a separate step that re-reads
 * this record. Keeping them apart is what makes the double-approval race harmless — two clicks
 * produce two approval rows, and the unique index on execution stops the second send.
 *
 * @throws ApprovalError — every failure path is explicit and denies.
 */
export async function approveAction(
  admin: SupabaseClient,
  args: ApproveArgs,
): Promise<ActionLogEntry> {
  const entry = await loadPending(admin, args.founderId, args.entryId)

  // 1. Only something actually awaiting approval can be approved. Re-approving an executed or
  //    declined action would otherwise mint fresh consent for work already decided.
  if (entry.status !== 'pending_approval') {
    throw new ApprovalError('not_pending', `This action is already '${entry.status}'.`)
  }

  // 2. THE PAYLOAD BINDING. The founder approves what they SAW. If the stored payload has since
  //    been regenerated, the hashes differ and consent does not transfer.
  if (!entry.payload_hash || entry.payload_hash !== args.payloadHash) {
    log.warn('approval refused — payload changed since it was shown', {
      actionId: entry.action_id, entryId: entry.id,
    })
    throw new ApprovalError(
      'payload_changed',
      'This action changed since you last saw it. Review the new version before approving.',
    )
  }

  // 3. Expiry. Consent is about a moment as much as a payload.
  if (Date.now() - new Date(entry.created_at).getTime() > APPROVAL_TTL_MS) {
    throw new ApprovalError('expired', 'This action is too old to approve. Let the next cycle prepare a fresh one.')
  }

  // 4. The mandate must still authorise it — re-checked HERE, not only at generation
  //    (Featureinventory UC-14.6). A founder can revoke or re-issue a mandate between the two.
  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    throw new ApprovalError('no_mandate', 'There is no confirmed mandate authorising this action.')
  }

  // 5. The Action must still be irreversible per the Registry. If it somehow is not, something
  //    is badly wrong — a reversible action should never have been pending in the first place.
  const action = getAction(entry.action_id)
  if (!action.irreversible) {
    throw new ApprovalError('not_approvable', 'This action does not require approval.')
  }

  log.info('action approved', { actionId: entry.action_id, entryId: entry.id, approvedBy: args.approvedBy })
  trackActionApproved(args.founderId, { actionId: entry.action_id, irreversible: true })

  // Append — the table is append-only, so consent is a NEW row sharing the payload hash.
  return recordAttempt(admin, {
    founderId: args.founderId,
    actionId: entry.action_id,
    irreversible: true,
    status: 'approved',
    programId: entry.program_id,
    executionId: entry.execution_id,
    provider: entry.provider,
    approvedBy: args.approvedBy,
    // The SAME hash as the row being approved — this is what links the sequence and lets a
    // later execution prove which payload consent was given for.
    payloadHash: args.payloadHash,
    result: { approvedEntryId: entry.id },
  })
}

/**
 * Decline a prepared Action.
 *
 * Recorded, not deleted: "the founder said no" is exactly the kind of thing an audit exists to
 * remember, and a declined action that simply vanished would look identical to one that was
 * never prepared.
 */
export async function declineAction(
  admin: SupabaseClient,
  args: { founderId: string; entryId: string; declinedBy: string },
): Promise<ActionLogEntry> {
  const entry = await loadPending(admin, args.founderId, args.entryId)
  if (entry.status !== 'pending_approval') {
    throw new ApprovalError('not_pending', `This action is already '${entry.status}'.`)
  }

  log.info('action declined', { actionId: entry.action_id, entryId: entry.id })
  // A decline is engagement too — a founder who reads and refuses came back just as surely as
  // one who approves. Counting only approvals would understate retention and flatter the model.
  trackActionDeclined(args.founderId, { actionId: entry.action_id })

  return recordAttempt(admin, {
    founderId: args.founderId,
    actionId: entry.action_id,
    irreversible: true,
    status: 'declined',
    programId: entry.program_id,
    executionId: entry.execution_id,
    provider: entry.provider,
    payloadHash: entry.payload_hash,
    result: { declinedEntryId: entry.id, declinedBy: args.declinedBy },
  })
}
