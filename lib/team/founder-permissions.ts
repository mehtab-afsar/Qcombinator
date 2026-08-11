/**
 * Founder-side team permission helpers — a founder's startup team (startup_members),
 * not investor teams (which use a separate, simpler two-role model: investor_team_members,
 * 'admin' | 'analyst' — see app/api/investor/team/**). Was named lib/team/permissions.ts,
 * which read as role-agnostic/shared; it never was — every function here is founder-only.
 *
 * Role hierarchy (highest → lowest): owner > admin > member > viewer
 *
 * Used server-side (API routes) and client-side (UI gating).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

// Agents that require owner or admin — too sensitive for employees
const PRIVILEGED_AGENTS = new Set(['felix', 'leo', 'sage'])

export function canAccessAgent(role: TeamRole, agentId: string): boolean {
  if (role === 'viewer') return false
  if (PRIVILEGED_AGENTS.has(agentId)) return role === 'owner' || role === 'admin'
  return true
}

export function canEditProfile(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canInviteMembers(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canRemoveMember(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (actorRole === 'owner') return targetRole !== 'owner'
  return false
}

export function canAccessBilling(role: TeamRole): boolean {
  return role === 'owner'
}

export function canConnectInvestors(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}

/** Assets are versioned (never overwritten), so a member's edit can never destroy the
 *  owner's or another member's work — it just adds a new version. Safe to allow broadly. */
export function canEditAsset(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'member'
}

/** Irreversible external Actions (send/publish/spend) stay owner/admin-only — matches
 *  canInviteMembers' bar, not canEditAsset's, because approval has no versioned undo. */
export function canApproveAction(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}

// ─── Server-side: fetch the caller's role in a startup ───────────────────────

export async function getCallerTeamRole(
  userId: string,
  startupId: string,
  supabase: SupabaseClient,
): Promise<TeamRole | null> {
  const { data } = await supabase
    .from('startup_members')
    .select('role')
    .eq('startup_id', startupId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.role as TeamRole) ?? null
}

// Resolve the startup_id for a user (their own workspace).
export async function getStartupIdForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase
    .from('founder_profiles')
    .select('startup_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.startup_id ?? null
}

// Fetch a user's role in their own startup in one query.
export async function getMyTeamRole(
  userId: string,
  supabase: SupabaseClient,
): Promise<{ role: TeamRole | null; startupId: string | null }> {
  const startupId = await getStartupIdForUser(userId, supabase)
  if (!startupId) return { role: null, startupId: null }
  const role = await getCallerTeamRole(userId, startupId, supabase)
  return { role, startupId }
}

/**
 * Resolve the founder_id a user's team's engine data (Mandate, Assets, Rhythm, Actions,
 * Q-Score) is actually stored under — startups.owner_user_id, not whichever teammate is
 * logged in. Every one of those tables' rows anchors to the owner's own auth.uid() from
 * whenever it was written; a teammate's own founder_id slot on those tables is empty. The
 * shared-visibility RLS policy (team_founder_ids(), see the Phase 2 migration) makes those
 * rows readable across the team, but a caller still has to ask for THIS id, not their own,
 * or the query just finds nothing under their own empty slot.
 *
 * Returns null if the user has no startup_id yet (pre-onboarding) or the startup has no
 * owner_user_id set (shouldn't happen post-20260807000002, but this avoids a runtime throw).
 */
export async function getAnchorFounderId(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const startupId = await getStartupIdForUser(userId, supabase)
  if (!startupId) return null
  const { data } = await supabase
    .from('startups')
    .select('owner_user_id')
    .eq('id', startupId)
    .maybeSingle()
  return data?.owner_user_id ?? null
}
