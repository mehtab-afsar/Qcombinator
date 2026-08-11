import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

export type TeamAuditEvent =
  | 'invited' | 'invite_cancelled' | 'invite_resent'
  | 'joined' | 'role_changed' | 'removed' | 'left'

/**
 * One append-only row per team-management action — see team_audit_log's own migration
 * comment for why this is a dedicated table, not a reuse of action_log. Fire-and-forget by
 * design: an audit-log write failing must never block the team action itself from
 * completing (same posture as the notifications inserts elsewhere in this codebase).
 */
export function logTeamEvent(
  supabase: SupabaseClient,
  event: {
    startupId: string
    actorId: string
    event: TeamAuditEvent
    targetEmail?: string
    targetUserId?: string
    metadata?: Record<string, unknown>
  },
): void {
  void supabase.from('team_audit_log').insert({
    startup_id:     event.startupId,
    actor_id:       event.actorId,
    event:          event.event,
    target_email:   event.targetEmail ?? null,
    target_user_id: event.targetUserId ?? null,
    metadata:       event.metadata ?? {},
  }).then(({ error }: { error: { message: string } | null }) => {
    if (error) log.error('[team-audit] insert failed:', error)
  })
}
