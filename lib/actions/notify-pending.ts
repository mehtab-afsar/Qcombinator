/**
 * Tells the founder an Action is waiting on them — the notification counterpart to the approval
 * gate in generate.ts. Fired once, right after an Action is recorded `pending_approval`; never
 * blocks the Rhythm cycle that triggered it (same non-blocking, try/catch-wrapped shape as the
 * cycle-finish notification in lib/rhythm/run.ts).
 *
 * Before this, an Action could sit `pending_approval` indefinitely with nothing telling the
 * founder it existed — the product's one real safety checkpoint (ADR-002/ADR-004: no approval
 * gates anywhere except this one) was invisible until someone opened the app.
 *
 * PII discipline matches action_log's own rule (CLAUDE.md §3): recipient count and domain only,
 * never an address. See payloadMetadata's docstring in ./payload.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAction, type ActionId } from '@/lib/registry'
import { log } from '@/lib/logger'
import { createNotification } from '@/lib/notifications/create'
import { sendActionPendingEmail } from '@/lib/email/send'
import type { PayloadMetadata } from './payload'

/** `entry.request` on the ActionLogEntry generateAction() just returned — recordAttempt() already
 *  reduced the real payload to this via payloadMetadata() before writing it, so the raw payload
 *  (recipient addresses, subject, body) never needs to leave generate.ts at all. */
export async function notifyActionPending(
  admin: SupabaseClient,
  founderId: string,
  actionId: ActionId,
  requestMetadata: PayloadMetadata,
): Promise<void> {
  const action = getAction(actionId)
  const { recipientCount, recipientDomains } = requestMetadata
  const summary = recipientCount > 0
    ? `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}${recipientDomains.length ? ` — ${recipientDomains.slice(0, 3).join(', ')}` : ''}`
    : undefined

  try {
    await createNotification({
      userId: founderId,
      type: 'action_pending',
      title: `Needs your approval: ${action.name}`,
      body: summary,
      metadata: { actionId, programId: action.program, recipientCount },
    })
  } catch (err) {
    log.warn('action-pending notification failed', { actionId, founderId, err: (err as Error)?.message })
  }

  try {
    const [{ data: userRes }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(founderId),
      admin.from('founder_profiles').select('full_name').eq('user_id', founderId).single(),
    ])
    const email = userRes?.user?.email
    if (email) {
      await sendActionPendingEmail({
        email,
        fullName: (profile as { full_name?: string } | null)?.full_name ?? 'there',
        actionName: action.name,
        summary,
      })
    }
  } catch (err) {
    log.warn('action-pending email failed', { actionId, founderId, err: (err as Error)?.message })
  }
}
