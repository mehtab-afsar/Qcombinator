/**
 * Team permission helpers.
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
