/**
 * Detecting replies to outreach this product sent.
 *
 * ⚠️ THIS IS THE ONE FILE HERE THAT TOUCHES A CONNECTOR. Everything in `lib/rhythm/**` must
 * import `./context` instead, which is a plain table read. A Rhythm step calling Gmail live is
 * ADR-026's decided territory, and `__tests__/outreach-replies-adr-guard.test.ts` asserts the
 * separation holds.
 *
 * ⚠️ WHO MAY CALL THIS: only a founder-initiated request — today, a page load
 * (`app/api/signals/outreach-replies/route.ts`). Never a cron, never a cycle step. Reading
 * someone's mailbox should require them to be present. `lib/connectors/gmail/read.ts` phrases the
 * rule as "a founder's own click"; a page view is the same principle one step wider, and is
 * recorded as such in the DecisionLog rather than left to a docstring.
 *
 * ⚠️ DETECTION NEVER STARTS WORK. It writes rows and creates a notification. Whether anything is
 * drafted in response is the founder's click, not this function's decision — that is what keeps
 * ADR-028 intact (a cycle is fed by founder activity) while still letting the product notice
 * something the founder hasn't.
 *
 * The gate order below is the design: for a founder who has never sent outreach — which is
 * everyone, today — a page load costs two indexed reads and zero external calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import { resolveGrant } from '@/lib/connectors/grants'
import { messageIdFor } from '@/lib/connectors/gmail/send'
import { findRepliesTo } from '@/lib/connectors/gmail/replies'
import { createNotification } from '@/lib/notifications/create'

/** Older sends are not worth re-checking; a reply weeks later is a new conversation. */
export const REPLY_WINDOW_DAYS = 30
/** A founder reloading twice in a minute must not cost two mailbox reads. */
export const MIN_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000
/** A hard ceiling on Gmail calls per sweep, so one page load can never become a storm. */
export const MAX_SENDS_PER_SWEEP = 25

export interface SweepResult {
  status: 'ok' | 'skipped' | 'not_connected' | 'error'
  sendsChecked: number
  /** NEW rows written by this sweep — not the total known. Zero on a re-sweep. */
  repliesFound: number
}

interface SentRow {
  id: string
  action_id: string
  program_id: string | null
  payload_hash: string | null
}

/** Has enough time passed since the last look? A missing cursor means never swept. */
async function dueForSweep(admin: SupabaseClient, founderId: string, now: number): Promise<boolean> {
  const { data } = await admin
    .from('outreach_reply_sweeps')
    .select('last_swept_at')
    .eq('founder_id', founderId)
    .maybeSingle()

  if (!data) return true
  const last = Date.parse((data as { last_swept_at: string }).last_swept_at)
  return Number.isNaN(last) || now - last >= MIN_SWEEP_INTERVAL_MS
}

/**
 * Sends worth checking: real, executed Gmail sends inside the window that carry a payload_hash —
 * without one there is no Message-ID to recompute, so there is nothing to look for.
 */
async function outstandingSends(admin: SupabaseClient, founderId: string): Promise<SentRow[]> {
  const since = new Date(Date.now() - REPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('action_log')
    .select('id, action_id, program_id, payload_hash')
    .eq('founder_id', founderId)
    .eq('provider', 'gmail')
    .eq('status', 'executed')
    .gte('created_at', since)
    .not('payload_hash', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MAX_SENDS_PER_SWEEP)

  if (error || !data) return []
  return data as SentRow[]
}

/** Overwritten every sweep — this is the cache half, and it must record a nil result too. */
async function recordSweep(
  admin: SupabaseClient, founderId: string, result: SweepResult, error?: string,
): Promise<void> {
  await admin.from('outreach_reply_sweeps').upsert({
    founder_id: founderId,
    last_swept_at: new Date().toISOString(),
    last_status: result.status,
    last_error: error ?? null,
    sends_checked: result.sendsChecked,
    replies_found: result.repliesFound,
  }, { onConflict: 'founder_id' })
}

/**
 * Look for replies to everything this founder recently sent.
 *
 * Never throws: detection is a background courtesy attached to a page load, and a Gmail outage
 * must not surface to the founder as a broken page.
 */
export async function sweepOutreachReplies(
  admin: SupabaseClient,
  founderId: string,
): Promise<SweepResult> {
  const nil: SweepResult = { status: 'skipped', sendsChecked: 0, repliesFound: 0 }

  try {
    // Gate 1 — has anything even been sent? One indexed read, and the stop for everyone today.
    const sends = await outstandingSends(admin, founderId)
    if (sends.length === 0) return nil

    // Gate 2 — looked recently? Cheap, and second because a founder with no sends never gets here.
    if (!await dueForSweep(admin, founderId, Date.now())) return nil

    // Gate 3 — is the mailbox even connected? `gmail_read` is a SEPARATE grant from the `gmail`
    // send connector: different scopes, different consent, its own row.
    const grant = await resolveGrant(admin, founderId, 'gmail_read').catch(() => null)
    if (!grant) {
      const result: SweepResult = { status: 'not_connected', sendsChecked: 0, repliesFound: 0 }
      await recordSweep(admin, founderId, result)
      return result
    }

    const rows: Record<string, unknown>[] = []
    for (const sent of sends) {
      const sentMessageId = messageIdFor(sent.payload_hash!)
      const replies = await findRepliesTo(grant, sentMessageId)
      for (const reply of replies) {
        rows.push({
          founder_id: founderId,
          sent_action_log_id: sent.id,
          action_id: sent.action_id,
          program_id: sent.program_id,
          sent_message_id: sentMessageId,
          reply_provider_id: reply.providerId,
          reply_from_domain: reply.fromDomain,
          reply_excerpt: reply.excerpt,
          replied_at: reply.repliedAt,
          dedupe_key: `${sentMessageId}:${reply.providerId}`,
        })
      }
    }

    // `ignoreDuplicates` plus `.select()` is what makes a re-sweep free AND silent: only rows that
    // did not already exist come back, so a second page load notifies nobody.
    let inserted: { id: string }[] = []
    if (rows.length > 0) {
      const { data } = await admin
        .from('outreach_reply_signals')
        .upsert(rows, { onConflict: 'founder_id,dedupe_key', ignoreDuplicates: true })
        .select('id')
      inserted = (data as { id: string }[] | null) ?? []
    }

    const result: SweepResult = {
      status: 'ok',
      sendsChecked: sends.length,
      repliesFound: inserted.length,
    }
    await recordSweep(admin, founderId, result)

    if (inserted.length > 0) {
      // Keyed on the newest reply, so a sweep that finds nothing new produces the same key and is
      // absorbed, while a genuinely new reply produces a new one.
      const newest = rows[rows.length - 1].reply_provider_id as string
      await createNotification({
        userId: founderId,
        type: 'outreach_replies_detected',
        title: inserted.length === 1
          ? 'Someone replied to your outreach'
          : `${inserted.length} people replied to your outreach`,
        body: 'Your team can draft follow-ups when you are ready.',
        dedupeKey: `outreach_replies:${newest}`,
      }).catch(() => { /* a missed notification must not fail the sweep */ })
    }

    return result
  } catch (err) {
    const message = (err as Error)?.message ?? 'unknown'
    log.warn('outreach reply sweep failed', { founderId, err: message })
    const result: SweepResult = { status: 'error', sendsChecked: 0, repliesFound: 0 }
    await recordSweep(admin, founderId, result, message).catch(() => {})
    return result
  }
}
