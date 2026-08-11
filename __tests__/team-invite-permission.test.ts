/**
 * Team Management, Phase 1 — the invite route never checked who was calling it.
 *
 * app/api/team/invite/route.ts uses getAdminClient() (service-role, RLS bypassed
 * entirely), so the application code is the ONLY gate that exists for this route.
 * It never called canInviteMembers() — a 'member' or 'viewer' could hit this route
 * directly and create a valid invite granting someone else 'admin' access.
 *
 * lib/team/founder-permissions.ts already had the right predicate (canInviteMembers,
 * owner/admin only); the route just never called it.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('the invite route checks the caller is owner or admin before creating an invite', () => {
  const src = read('app/api/team/invite/route.ts')

  it('imports the real permission check, not a hand-rolled one', () => {
    expect(src).toContain("import { getCallerTeamRole, canInviteMembers } from '@/lib/team/founder-permissions'")
  })

  it('resolves the caller\'s role and rejects when canInviteMembers() says no', () => {
    expect(src).toMatch(/const callerRole = await getCallerTeamRole\(user\.id, startupId, supabase\)/)
    expect(src).toMatch(/if\s*\(\s*!callerRole\s*\|\|\s*!canInviteMembers\(callerRole\)\s*\)/)
  })

  it('the role check runs before the invite row is created, not after', () => {
    const checkIdx = src.indexOf('canInviteMembers(callerRole)')
    const insertIdx = src.indexOf("from('team_invites')")
    expect(checkIdx).toBeGreaterThan(-1)
    expect(insertIdx).toBeGreaterThan(-1)
    expect(checkIdx).toBeLessThan(insertIdx)
  })

  it('a denied invite returns 403, not a silent pass-through', () => {
    const block = src.slice(src.indexOf('canInviteMembers(callerRole)'), src.indexOf('canInviteMembers(callerRole)') + 200)
    expect(block).toContain('status: 403')
  })
})

/**
 * The Team tab's toast calls (invite sent, member removed, role changed, ...) wrote
 * to a page-local useState that never talked to the real ToastProvider mounted in
 * app/layout.tsx — a second, parallel toast system that silently went nowhere useful
 * (a fixed top-right div, no dismiss, no shared queue). Fixed by routing every call
 * through the real shared useToast() hook instead.
 */
describe('the settings page uses the real shared toast, not a second parallel one', () => {
  const src = read('app/founder/settings/page.tsx')

  it('imports and calls the shared useToast hook', () => {
    expect(src).toContain("import { useToast } from '@/features/shared/hooks/useToast'")
    expect(src).toContain('const { toast } = useToast()')
  })

  it('the page-local showToast()/setToast() implementation is gone, not just unused', () => {
    expect(src).not.toContain('function showToast')
    expect(src).not.toContain('setToast(')
  })

  it('every former showToast() call site now uses the shared toast.success/toast.error API', () => {
    expect(src).not.toMatch(/\bshowToast\(/)
    expect(src).toMatch(/toast\.(success|error)\(/)
  })
})
