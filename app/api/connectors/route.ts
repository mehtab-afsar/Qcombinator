/**
 * GET /api/connectors — the founder's connections, and what this build can connect to.
 *
 * Never returns `token_ref` — `toGrant` in lib/connectors/grants.ts drops it, and it has no
 * business leaving that module. The client needs to know WHICH account is connected and what it
 * may do, never the credential or its reference.
 *
 * Thin: validate → call lib/connectors → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { listGrants } from '@/lib/connectors/grants'
import { listConnectors } from '@/lib/connectors/registry'
import { log } from '@/lib/logger'

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped: RLS (SELECT-own) is the tenancy boundary, as in /api/briefings.
    const supabase = await createClient()
    const grants = await listGrants(supabase, auth.user.id)

    return NextResponse.json({
      grants,
      // What this build could connect to. Driven by the connector registry, so adding a provider
      // shows up here automatically — no route change, no UI change.
      available: listConnectors().map(c => ({ provider: c.provider, scopes: c.scopes })),
    })
  } catch (err) {
    log.error('GET /api/connectors', { err })
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
  }
}
