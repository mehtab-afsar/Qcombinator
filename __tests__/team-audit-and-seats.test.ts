/**
 * Team Management, Phase 4 — audit trail + seat limits.
 *
 * Neither existed before this: the invite route enforced no seat cap despite the upgrade
 * paywall promising "up to 3 analysts," and no team action (invite/join/role-change/remove)
 * left any record beyond the current row state — a role change overwrote in place with no
 * history, same problem CLAUDE.md's append-only rule exists to prevent.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('seat limits — a live headcount, not a subscription_usage metered feature', () => {
  it('FOUNDER_SEAT_LIMITS is separate from FOUNDER_PLAN_LIMITS, not folded into it', () => {
    const src = read('lib/billing/plans.ts')
    expect(src).toMatch(/export const FOUNDER_SEAT_LIMITS: Record<FounderTier, number>/)
    // Not a MeteredFeature — team_seats never touches subscription_usage's CHECK constraint.
    expect(src).not.toMatch(/MeteredFeature\s*=\s*'agent_chat'\s*\|\s*'qscore_recalc'\s*\|\s*'investor_connection'\s*\|\s*'team_seats'/)
  })

  it('the invite route counts current members and rejects at the cap, before creating the invite', () => {
    const src = read('app/api/team/invite/route.ts')
    const capCheckIdx = src.indexOf('FOUNDER_SEAT_LIMITS[tier]')
    const insertIdx = src.indexOf(".insert({\n            startup_id: startupId,")
    expect(capCheckIdx).toBeGreaterThan(-1)
    expect(insertIdx).toBeGreaterThan(-1)
    expect(capCheckIdx).toBeLessThan(insertIdx)
    expect(src).toContain('status: 403')
  })

  it('a resend (existing pending invite) skips the seat-limit check — it does not add a new member', () => {
    const src = read('app/api/team/invite/route.ts')
    const elseIdx = src.indexOf('} else {')
    const capCheckIdx = src.indexOf('FOUNDER_SEAT_LIMITS[tier]')
    const cooldownIdx = src.indexOf('RESEND_COOLDOWN_MS')
    expect(elseIdx).toBeGreaterThan(-1)
    expect(cooldownIdx).toBeGreaterThan(-1)
    expect(cooldownIdx).toBeLessThan(elseIdx)
    expect(capCheckIdx).toBeGreaterThan(elseIdx)
  })

  it('resolves the tier from the STARTUP OWNER, not the inviting caller', () => {
    // An admin inviting has no billing plan of their own for this workspace — the workspace's
    // seat cap is whatever the owner is paying for.
    const src = read('app/api/team/invite/route.ts')
    expect(src).toContain("from('startups')")
    expect(src).toMatch(/eq\('user_id', startupRow\.owner_user_id\)/)
  })
})

describe('every team action writes an append-only audit row', () => {
  it('invite creation logs "invited", and a resend logs "invite_resent" — not the same event', () => {
    const src = read('app/api/team/invite/route.ts')
    expect(src).toMatch(/logTeamEvent\(supabase,\s*\{\s*\n\s*startupId,\s*actorId:\s*user\.id,\s*event:\s*existingInvite \? 'invite_resent' : 'invited'/)
  })

  it('accepting an invite logs "joined"', () => {
    const src = read('app/api/team/join/route.ts')
    expect(src).toContain("event: 'joined'")
  })

  it('a role change logs "role_changed"', () => {
    const src = read('app/api/team/members/route.ts')
    expect(src).toContain("event: 'role_changed'")
  })

  it('cancelling a pending invite logs "invite_cancelled", distinct from removing a real member', () => {
    const src = read('app/api/team/members/route.ts')
    expect(src).toContain("event: 'invite_cancelled'")
  })

  it('removal distinguishes being removed by someone else from leaving voluntarily', () => {
    const src = read('app/api/team/members/route.ts')
    expect(src).toMatch(/event:\s*selfRemoval\s*\?\s*'left'\s*:\s*'removed'/)
  })

  it('logTeamEvent is the one shared writer — not four hand-rolled inserts', () => {
    for (const route of ['app/api/team/invite/route.ts', 'app/api/team/join/route.ts', 'app/api/team/members/route.ts']) {
      const src = read(route)
      expect(src).toContain("from '@/lib/team/audit'")
      expect(src).not.toMatch(/\.from\('team_audit_log'\)\.insert/)
    }
  })
})

describe('team events that affect a specific person notify them, through the existing notifications table', () => {
  it('joining notifies whoever sent the invite, not the whole team', () => {
    const src = read('app/api/team/join/route.ts')
    expect(src).toContain("user_id:  invite.invited_by")
    expect(src).toContain("type:     'team_member_joined'")
  })

  it('a role change notifies the person whose role changed', () => {
    const src = read('app/api/team/members/route.ts')
    const block = src.slice(src.indexOf("event: 'role_changed'"), src.indexOf("event: 'role_changed'") + 500)
    expect(block).toContain("type:     'team_role_changed'")
    expect(block).toContain('user_id:  userId')
  })

  it('being removed notifies the removed person, but leaving voluntarily does not self-notify', () => {
    const src = read('app/api/team/members/route.ts')
    expect(src).toContain("type:     'team_member_removed'")
    expect(src).toMatch(/if\s*\(\s*!selfRemoval\s*\)\s*\{[\s\S]{0,100}notifications/)
  })

  it('the new notification types are registered so the bell renders them, not the Bell fallback', () => {
    const src = read('features/shared/components/NotificationPanel.tsx')
    for (const type of ['team_member_joined', 'team_role_changed', 'team_member_removed']) {
      expect(src).toContain(`${type}:`)
    }
  })
})

describe('team_audit_log — append-only, and survives account deletion', () => {
  const migration = read('supabase/migrations/20260811000004_team_audit_log.sql')

  it('rejects UPDATE and DELETE by default', () => {
    expect(migration).toMatch(/RAISE EXCEPTION 'team_audit_log is append-only/)
  })

  it('carries the SAME cascade-delete carve-out action_log needed a follow-up migration for', () => {
    // action_log shipped without this and blocked account deletion entirely
    // (20260715000010_briefings_allow_cascade_delete.sql) — shipping it from day one here.
    expect(migration).toMatch(/pg_trigger_depth\(\)\s*>\s*1/)
  })

  it('reuses the existing user_startup_ids() helper for its SELECT policy, not a new one', () => {
    expect(migration).toContain('public.user_startup_ids()')
    expect(migration).not.toContain('team_founder_ids()')
  })

  it('is not a reuse of action_log — a genuinely separate table', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS team_audit_log')
  })
})

/**
 * Clicking "Resend" always inserted a brand-new team_invites row for the same email — a founder
 * who clicked it 3 times ended up with 3 pending invites for one person, each with its own token.
 * Also nothing stopped rapid repeat clicks, and a failed email send was swallowed silently: the
 * route returned 201 "invite created" whether or not Resend actually delivered anything.
 */
describe('resending an invite updates the existing row instead of duplicating it', () => {
  const src = read('app/api/team/invite/route.ts')

  it('looks up an existing pending invite for the email before deciding insert vs update', () => {
    const lookupIdx = src.indexOf("from('team_invites')\n      .select('id, created_at')")
    const decisionIdx = src.indexOf('existingInvite\n      ? await supabase')
    expect(lookupIdx).toBeGreaterThan(-1)
    expect(decisionIdx).toBeGreaterThan(-1)
    expect(lookupIdx).toBeLessThan(decisionIdx)
    // Only pending invites count as "existing" — an already-accepted one must not block a
    // fresh invite to the same address if they left and get invited again.
    expect(src).toContain(".is('accepted_at', null)")
  })

  it('a resend UPDATEs the existing row (fresh token, pushed-out expiry) rather than inserting a second one', () => {
    const updateIdx = src.indexOf('.update({ role, token: inviteToken')
    expect(updateIdx).toBeGreaterThan(-1)
    expect(src.slice(updateIdx, updateIdx + 200)).toContain('.eq(\'id\', existingInvite.id)')
  })

  it('enforces a cooldown so rapid repeat clicks cannot spam the same invite', () => {
    expect(src).toContain('RESEND_COOLDOWN_MS = 2 * 60 * 1000')
    expect(src).toContain('status: 429')
  })

  it('email delivery is awaited, not fire-and-forget, and its success is returned to the caller', () => {
    // The old code did `void sendTeamInviteEmail(...).catch(...)` and always responded 201 —
    // a failed send was invisible to everyone, including the founder who'd see "invite sent".
    expect(src).not.toMatch(/void sendTeamInviteEmail/)
    expect(src).toContain('const emailSent = await sendTeamInviteEmail(')
    expect(src).toContain('NextResponse.json({ invite, emailSent }')
  })
})

describe('sendTeamInviteEmail reports whether the email actually sent', () => {
  const src = read('lib/email/send.ts')

  it('returns a boolean instead of void, matching sendInvestorTeamInviteEmail\'s established pattern', () => {
    expect(src).toContain('export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<boolean>')
    const fnIdx = src.indexOf('export async function sendTeamInviteEmail')
    const nextFnIdx = src.indexOf('export interface InvestorTeamInviteEmailParams')
    const body = src.slice(fnIdx, nextFnIdx)
    expect(body).toContain('if (!resend) return false')
    expect(body).toMatch(/if \(error\) \{ log\.error\([^)]*\); return false \}/)
    expect(body).toContain('return true')
  })
})
