/**
 * What the founder's screen needs to know about replies — the UI half of `context.ts`.
 *
 * Deliberately a separate file from `context.ts`, which renders replies as prompt text for the
 * model. Same table, two audiences, two shapes: a model wants prose and domains, a screen wants
 * a count and one boolean. Merging them would mean one function whose return value is right for
 * neither, and would put UI concerns inside the file `__tests__/outreach-replies-adr-guard.test.ts`
 * pins as the passive, no-fetch read a Rhythm step is allowed to touch.
 *
 * ⚠️ "Handled" is derived, not stored. It asks whether a follow-up run already exists carrying
 * this batch's key — the same `dedupe_key` the click writes to `action_log`. Nothing needs a
 * mutable `handled` column, which would be a second source of truth for a fact `action_log`
 * already records, and would have to be kept honest by hand.
 *
 * ⚠️ NO ADDRESSES leave this file either. It returns counts and a date; even the domains that
 * context.ts renders for the model are not needed to say "three people replied".
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReplySummary {
  count: number
  /** The newest signal's id — the batch identity the follow-up run dedupes on. Null when none. */
  newestSignalId: string | null
  /** ISO date of the most recent reply, for "someone replied on the 2nd" copy. */
  newestAt: string | null
  /** A follow-up has already been drafted for this batch. A new reply makes this false again. */
  handled: boolean
  /**
   * The idempotency key the follow-up run must carry, minted here and passed back verbatim by
   * whoever clicks. The client is a courier, not an author: it means `followUpDedupeKey` has
   * exactly one definition, server-side, rather than a second copy in a component that would
   * drift the day the format changes and silently stop deduping.
   */
  followUpKey: string | null
}

const EMPTY: ReplySummary = {
  count: 0, newestSignalId: null, newestAt: null, handled: false, followUpKey: null,
}

/** The action_log dedupe key a follow-up run for this batch carries. One definition, used by the
 *  route that reads it and the client that writes it — never spelled out twice. */
export function followUpDedupeKey(newestSignalId: string): string {
  return `followup:${newestSignalId}`
}

export async function getReplySummary(
  admin: SupabaseClient,
  founderId: string,
): Promise<ReplySummary> {
  // One row over the wire, not every reply ever received: `count: 'exact'` returns the true
  // total in the response, and the newest row is the only one whose fields are actually used.
  // Selecting them all to call `.length` on would read a founder's whole reply history to
  // render one number.
  const { data, count, error } = await admin
    .from('outreach_reply_signals')
    .select('id, detected_at, replied_at', { count: 'exact' })
    .eq('founder_id', founderId)
    .order('detected_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return EMPTY

  const newest = (data as { id: string; detected_at: string; replied_at: string | null }[])[0]

  // One more indexed read, and only when there is something to ask about.
  const { data: run } = await admin
    .from('action_log')
    .select('id')
    .eq('founder_id', founderId)
    .eq('dedupe_key', followUpDedupeKey(newest.id))
    .maybeSingle()

  return {
    // `count` is null only if the server declined to compute it; one row is known to exist here.
    count: count ?? 1,
    newestSignalId: newest.id,
    newestAt: newest.replied_at ?? newest.detected_at,
    handled: Boolean(run),
    followUpKey: followUpDedupeKey(newest.id),
  }
}
