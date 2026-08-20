/**
 * app/api/contacts/** — a source-level guard on the ONE thing that must never silently change:
 * these routes must use the user-scoped `createClient()`, not `createAdminClient()`. RLS is the
 * tenancy boundary for this table (auth.uid() = founder_id) — an admin-client write would bypass
 * that guarantee entirely and let any authenticated request write/read any founder's contacts by
 * just supplying a different founder_id. Matches __tests__/action-route-wiring.test.ts's
 * established source-scanning convention for this same class of regression.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const listRoute = readFileSync(join(__dirname, '..', 'app/api/contacts/route.ts'), 'utf8')
const itemRoute = readFileSync(join(__dirname, '..', 'app/api/contacts/[id]/route.ts'), 'utf8')

describe('app/api/contacts/route.ts — RLS is the tenancy boundary, not this route', () => {
  it('imports the user-scoped createClient, never createAdminClient', () => {
    expect(listRoute).toContain("import { createClient } from '@/lib/supabase/server'")
    expect(listRoute).not.toContain('createAdminClient')
  })

  it('POST scopes the insert to the authenticated user, not a client-supplied id', () => {
    expect(listRoute).toContain('founder_id: auth.user.id')
  })

  it('POST validates through founderContactPostSchema before writing anything', () => {
    expect(listRoute).toContain('founderContactPostSchema')
    expect(listRoute).toContain('parseBody(req, founderContactPostSchema)')
  })

  it('POST enforces the row-count cap before inserting', () => {
    expect(listRoute).toContain('MAX_CONTACTS_PER_FOUNDER')
  })
})

describe('app/api/contacts/[id]/route.ts — same boundary, the delete path', () => {
  it('imports the user-scoped createClient, never createAdminClient', () => {
    expect(itemRoute).toContain("import { createClient } from '@/lib/supabase/server'")
    expect(itemRoute).not.toContain('createAdminClient')
  })

  it('DELETE scopes to the authenticated user\'s own rows explicitly, not just by RLS', () => {
    expect(itemRoute).toContain(".eq('founder_id', auth.user.id)")
  })
})
