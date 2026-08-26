/**
 * The one place that writes to the `notifications` table — replaces 16 ad-hoc
 * `.from('notifications').insert(...)` calls scattered across founder and investor API routes,
 * lib/rhythm/run.ts, and features/qscore/services/agent-signal.ts (see the notification-system
 * plan). Every one of those now calls createNotification() instead of writing its own insert.
 *
 * Three things a bespoke insert can't get right on its own, so this is the only path allowed to:
 * 1. Always the typed admin client — the table's RLS policy only allows service_role to insert;
 *    a request-scoped client silently no-ops, which is exactly the bug this centralizes away.
 * 2. Validates `type` against the registry (lib/notifications/registry.ts) — an unregistered
 *    type is a bug at the call site, not a new kind of notification, so it's rejected, not sent.
 * 3. Checks the user's notification_preferences for that type's category before writing, so a
 *    disabled category produces nothing to clean up later, not a row that's hidden client-side.
 */

import { z } from 'zod'
import { createTypedAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import type { Json } from '@/types/supabase'
import { NOTIFICATION_REGISTRY, isNotificationType, type NotificationType, type PreferenceCategory } from './registry'

const paramsSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().refine(isNotificationType, { message: 'Unknown notification type — register it in lib/notifications/registry.ts first' }),
  title: z.string().min(1),
  body: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Set this when the same event could plausibly fire twice (a retried cron run, a re-entered
   *  Rhythm cycle) — createNotification() upserts on (user_id, dedupe_key) instead of inserting
   *  a duplicate. Omit for one-off, definitely-once events. */
  dedupeKey: z.string().optional(),
})

export type CreateNotificationParams = z.input<typeof paramsSchema>

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    log.error('[notifications] invalid createNotification call:', parsed.error.flatten())
    return
  }
  const { userId, type, title, body, metadata, dedupeKey } = parsed.data
  const config = NOTIFICATION_REGISTRY[type as NotificationType]

  if (config.preferenceCategory && !(await isCategoryEnabled(userId, config.preferenceCategory))) {
    return
  }

  const admin = createTypedAdminClient()
  const row = {
    user_id: userId, type, title,
    body: body ?? null,
    metadata: (metadata ?? {}) as Json,
    dedupe_key: dedupeKey ?? null,
  }

  const { error } = dedupeKey
    ? await admin.from('notifications').upsert(row, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    : await admin.from('notifications').insert(row)

  if (error) log.error(`[notifications] createNotification(${type}) failed:`, error)
}

/** For cron-driven fan-out (deal-flow alerts, digest-style batches) — same validation and
 *  preference gating per row, just parallelized. A partial failure logs but doesn't throw:
 *  one bad row in a batch of 40 shouldn't drop the other 39. */
export async function createNotifications(paramsList: CreateNotificationParams[]): Promise<void> {
  await Promise.all(paramsList.map(p => createNotification(p)))
}

async function isCategoryEnabled(userId: string, category: PreferenceCategory): Promise<boolean> {
  const admin = createTypedAdminClient()
  const { data } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // No preferences row yet = nothing to opt out with — defaults apply (every category ships
  // enabled by default at the schema level), so never block a first-ever notification on it.
  if (!data) return true
  return data[category] ?? true
}
