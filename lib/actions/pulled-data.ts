/**
 * A founder-triggered pull of real Connector data, rendered as Company Context text — the cache
 * behind `monitor_and_classify_responses` (Gmail-read) and `monitor_lead_generation` (PostHog),
 * the two Actions that have never had anything beyond Company Context to reason from.
 *
 * Mirrors `lib/contacts/context.ts` and `lib/connectors/context.ts` exactly: same signature
 * shape, `null` rather than a throw on any failure, and the caller wraps this in `.catch(() =>
 * null)` regardless — a cache lookup must never break a cycle.
 *
 * ONE row per (founder, action) — see the `founder_pulled_data` migration's own comment for why
 * this is a cache, not a log. Only `app/api/actions/[id]/pull-data/route.ts` ever writes to
 * this table; this file only ever reads it.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Which Actions accept a founder-triggered pull, and from which connector. The single source of
 * truth for both the pull route and the founder-facing "last pulled" timestamp — a third Action
 * gaining this needs one line here, nothing else.
 */
export const PULL_SOURCES: Readonly<Record<string, 'gmail_read' | 'posthog'>> = {
  monitor_and_classify_responses: 'gmail_read',
  monitor_lead_generation: 'posthog',
}

interface PulledDataRow {
  content: string
  pulled_at: string
}

export async function getPulledDataContext(
  admin: SupabaseClient,
  founderId: string,
  actionId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('founder_pulled_data')
    .select('content, pulled_at')
    .eq('founder_id', founderId)
    .eq('action_id', actionId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as PulledDataRow
  if (!row.content.trim()) return null

  return [
    `Pulled at your request on ${row.pulled_at.slice(0, 10)}. This is real, not the model's own reasoning.`,
    '',
    row.content.trim(),
  ].join('\n')
}

/**
 * When was real data last pulled for each of a founder's Actions — for the Actions list UI's
 * "last pulled" note. One query, not one per Action; a missing key just means never pulled.
 */
export async function getPulledAtTimestamps(
  admin: SupabaseClient,
  founderId: string,
  actionIds: readonly string[],
): Promise<Record<string, string>> {
  if (actionIds.length === 0) return {}

  const { data, error } = await admin
    .from('founder_pulled_data')
    .select('action_id, pulled_at')
    .eq('founder_id', founderId)
    .in('action_id', actionIds)

  if (error || !data) return {}
  return Object.fromEntries((data as { action_id: string; pulled_at: string }[])
    .map(row => [row.action_id, row.pulled_at]))
}
