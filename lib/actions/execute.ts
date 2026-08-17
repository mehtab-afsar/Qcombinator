/**
 * F14 — executing an approved Action. **The only path in this product that touches the outside
 * world**, and the last code between an approval and a stranger's inbox.
 *
 * Approval and execution are deliberately separate (F13_F14_DESIGN §7): approving records
 * consent, this spends it. Everything is re-checked HERE, because the world can change between
 * the two — a mandate revoked, a connector disconnected, a payload regenerated.
 *
 * ⚠️ The outcome may legitimately be UNKNOWN. Gmail has no idempotency key, so a timeout leaves
 * a genuinely unanswerable question. We record `unknown` and say so, rather than guessing —
 * guessing "failed" invites a retry that double-sends, and guessing "sent" tells the founder
 * something we cannot prove.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAction } from '@/lib/registry'
import { getCurrentContract } from '@/lib/mandate/contract'
import { log } from '@/lib/logger'
import { trackActionExecuted } from '@/lib/analytics'
import { getConnector } from '@/lib/connectors/registry'
import { resolveGrant } from '@/lib/connectors/grants'
import { RecipientBlockedError, ChannelBlockedError } from '@/lib/connectors/allowlist'
import { recordAttempt, AlreadyExecutedError, type ActionLogEntry } from './log'
import { hashPayload } from './payload'
import { resolvePayload, deletePayload } from './payload-vault'
import { VaultError } from '@/lib/connectors/vault'

/**
 * Delete the transient payload once a terminal outcome — executed, failed, or unknown — is
 * recorded. Best-effort: the outcome is already durably recorded regardless of this succeeding,
 * and an orphaned vault secret is exactly what the defensive TTL sweep exists to catch. Never
 * lets cleanup failure mask the real outcome.
 */
async function cleanupPayload(admin: SupabaseClient, payloadRef: string, actionId: string): Promise<void> {
  try {
    await deletePayload(admin, payloadRef)
  } catch (err) {
    log.warn('payload cleanup failed after execution', { actionId, err: (err as Error)?.message })
  }
}

export class ExecutionError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ExecutionError'
    this.code = code
  }
}

export interface ExecuteArgs {
  founderId: string
  actionId: string
  programId: string | null
  executionId: string | null
  /** The Vault ref (ActionLogEntry.payloadRef) holding the real payload — resolved inside this
   *  function, never passed in raw. Nothing outside execute.ts and payload-vault.ts should ever
   *  hold the real content in memory. */
  payloadRef: string
  /** The hash recorded on the approval — proof of what the founder actually consented to. */
  approvedHash: string
}

/**
 * Send an approved Action through its Connector.
 *
 * Every branch that cannot prove it is safe DENIES. There is no path through this function that
 * reaches a provider without: a confirmed mandate, an irreversible-and-approved action, a
 * matching payload hash, an active grant, and a recipient the allowlist permits.
 */
export async function executeApprovedAction(
  admin: SupabaseClient,
  args: ExecuteArgs,
): Promise<ActionLogEntry> {
  const action = getAction(args.actionId)

  // 0. Resolve the real content. Nothing before this point in the whole product has ever held
  //    it — action_log only ever stored a hash + redacted metadata. Fail closed on any vault
  //    problem: a missing or unreadable payload is never a reason to guess or proceed anyway.
  let payload
  try {
    payload = await resolvePayload(admin, args.payloadRef)
  } catch (err) {
    if (err instanceof VaultError) {
      throw new ExecutionError('payload_unavailable', 'The prepared content could not be retrieved.')
    }
    throw err
  }

  // 1. The payload must be the one that was approved. Recomputed here rather than trusted:
  //    an approval is consent to a specific message, not to an action id.
  if (hashPayload(payload) !== args.approvedHash) {
    throw new ExecutionError('payload_changed', 'This action changed after it was approved.')
  }

  // 2. The mandate must STILL authorise it (Featureinventory UC-14.6 — re-check at execution).
  const contract = await getCurrentContract(admin, args.founderId)
  if (!contract || contract.status !== 'confirmed') {
    throw new ExecutionError('no_mandate', 'There is no confirmed mandate authorising this.')
  }

  // 3. Nothing without a connector reaches this function at all.
  if (!action.connector) {
    throw new ExecutionError('not_external', 'This action does not send anything.')
  }

  // 4. The grant must be live. resolveGrant fails closed on revoked, expired, or a missing
  //    credential — a founder who disconnected between approving and now is respected.
  const grant = await resolveGrant(admin, args.founderId, action.connector)

  // 5. Reserve the attempt BEFORE calling the provider — the fail-fast-before-cost rule that
  //    operating_rhythm_runs already follows. A double-click loses here on the unique index
  //    (23505 → AlreadyExecutedError) rather than at the provider, where it would be a
  //    second email.
  //
  //    ⚠️ THE SLOT IS HELD EVEN IF THE SEND THEN FAILS, and that is deliberate. The index covers
  //    'sending' as well as 'executed', so once this row exists no further attempt can be made
  //    for this (action, run) — not even after a definite-looking failure. The alternative is
  //    releasing the slot on failure, which requires deciding "the provider definitely did not
  //    accept it". We cannot decide that reliably: a connection dropped after Gmail accepted the
  //    message is indistinguishable from one dropped before. Releasing on a wrong guess sends the
  //    email twice; holding on a wrong guess sends it zero times. Zero is the recoverable one.
  //
  //    Recovery is by the NEXT CYCLE, not by a retry: the rhythm regenerates the Action against a
  //    new execution_id, which is a fresh slot and a fresh approval. A founder is never stuck —
  //    they are delayed by one cycle, and never surprised by a duplicate.
  let reserved: ActionLogEntry
  try {
    reserved = await recordAttempt(admin, {
      founderId: args.founderId,
      actionId: args.actionId,
      irreversible: true,
      // 'sending', NOT 'executed': the slot is held, but nothing has gone yet. Reserving as
      // 'executed' made the log claim sends that never happened AND permanently blocked retries
      // when a send failed — both found by the first real send.
      status: 'sending',
      programId: args.programId,
      executionId: args.executionId,
      provider: action.connector,
      payload,
      payloadRef: args.payloadRef,
      result: { phase: 'reserved' },
    })
  } catch (err) {
    if (err instanceof AlreadyExecutedError) throw err // caller reports success-already-done
    throw err
  }

  // The idempotency key is derived from the approved hash, so the SAME logical send always
  // produces the same Message-ID — which is what makes an ambiguous timeout recoverable.
  const connector = getConnector(action.connector)
  let outcome
  try {
    outcome = await connector.send(grant, {
      idempotencyKey: args.approvedHash,
      recipients: payload.recipients ?? [],
      subject: payload.subject ?? '',
      body: payload.body ?? '',
      channel: payload.channel,
    })
  } catch (err) {
    // The allowlist refusing outside production is the ONE case that must be loud and obvious —
    // it means something tried to reach a non-allowlisted destination.
    if (err instanceof RecipientBlockedError) {
      log.error('SEND BLOCKED — non-allowlisted recipient outside production', {
        actionId: args.actionId, blockedCount: err.blocked.length,
      })
    }
    if (err instanceof ChannelBlockedError) {
      log.error('SEND BLOCKED — non-allowlisted channel outside production', {
        actionId: args.actionId, blockedChannel: err.channel,
      })
    }
    const failed = await recordAttempt(admin, {
      founderId: args.founderId, actionId: args.actionId, irreversible: true, status: 'failed',
      programId: args.programId, executionId: args.executionId, provider: action.connector,
      payloadHash: args.approvedHash,
      result: { error: (err as Error)?.message ?? 'send failed', reservedId: reserved.id },
    })
    await cleanupPayload(admin, args.payloadRef, args.actionId)
    return failed
  }

  // Record what actually happened. `unknown` is a first-class outcome, not a failure.
  const status = outcome.status === 'sent' ? 'executed' : outcome.status === 'unknown' ? 'unknown' : 'failed'
  if (outcome.status === 'unknown') {
    log.error('send outcome UNKNOWN — awaiting reconciliation', {
      actionId: args.actionId, reason: outcome.reason,
    })
  }

  trackActionExecuted(args.founderId, {
    actionId: args.actionId,
    provider: action.connector,
    outcome: status,
  })

  const settled = await recordAttempt(admin, {
    founderId: args.founderId,
    actionId: args.actionId,
    irreversible: true,
    status,
    programId: args.programId,
    executionId: args.executionId,
    provider: action.connector,
    payloadHash: args.approvedHash,
    result: outcome.status === 'sent'
      ? { providerId: outcome.providerId, reservedId: reserved.id }
      : { reason: outcome.reason, reservedId: reserved.id },
  })
  // Every branch here is a genuinely terminal outcome — even 'unknown' has finished attempting
  // to send, so the transient copy has served its purpose (a reconciliation pass, if one is ever
  // built, would use the provider/idempotency key on the log row, not the original payload).
  await cleanupPayload(admin, args.payloadRef, args.actionId)
  return settled
}
