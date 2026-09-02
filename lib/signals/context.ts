/**
 * Replies to the founder's own outreach, rendered as Company Context text.
 *
 * ⚠️ THIS FILE MAKES NO EXTERNAL CALL, AND THAT IS THE WHOLE POINT. It is a plain read of the
 * `outreach_reply_signals` table, which `lib/signals/outreach-replies.ts` filled earlier from a
 * founder-initiated request. A Rhythm step reaching a Connector live would be ADR-026's decided
 * territory; reading a cache that a founder's own presence filled is not. Same split, same
 * reasoning, as `lib/actions/pulled-data.ts` beside the pull route, and
 * `lib/connectors/context.ts` beside the Stripe connector.
 *
 * `__tests__/outreach-replies-adr-guard.test.ts` asserts there is no `fetch` in here. If that
 * ever needs relaxing, the honest move is a new ADR, not a quiet import.
 *
 * Mirrors `lib/actions/pulled-data.ts` exactly: same signature shape, `null` rather than a throw
 * on any failure, and the caller wraps it in `.catch(() => null)` regardless — a lookup must
 * never break a cycle.
 *
 * ⚠️ NO ADDRESSES. The table stores a sender's domain, never their address, and nothing here
 * widens that. A prompt does not need to know who replied to write a good follow-up; it needs to
 * know that someone did, from where, and roughly what they said.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Enough for a follow-up to be specific without turning the prompt into an inbox. */
const CONTEXT_LIMIT = 20

interface ReplySignalRow {
  action_id: string
  reply_from_domain: string | null
  reply_excerpt: string | null
  replied_at: string | null
  detected_at: string
}

export async function getOutreachRepliesContext(
  admin: SupabaseClient,
  founderId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('outreach_reply_signals')
    .select('action_id, reply_from_domain, reply_excerpt, replied_at, detected_at')
    .eq('founder_id', founderId)
    .order('detected_at', { ascending: false })
    .limit(CONTEXT_LIMIT)

  if (error || !data || data.length === 0) return null

  const rows = data as ReplySignalRow[]
  const lines = rows.map(row => {
    const when = (row.replied_at ?? row.detected_at).slice(0, 10)
    const who = row.reply_from_domain ? `someone at ${row.reply_from_domain}` : 'someone'
    const said = row.reply_excerpt?.trim()
    return said ? `- ${when} · ${who}: "${said}"` : `- ${when} · ${who} replied`
  })

  return [
    'People who replied to outreach your team sent. This is real — it happened in the founder\'s',
    'own mailbox, and is not the model\'s own reasoning. Work from these rather than from any',
    'earlier summary of what outreach was sent.',
    '',
    ...lines,
  ].join('\n')
}
