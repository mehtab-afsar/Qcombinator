/**
 * GET /api/executives — the fixed 5-executive roster, for the founder-facing Command View.
 *
 * The only new server surface the Command View redesign needed. `listExecutives()` has existed
 * server-side all along (lib/registry/index.ts) — nothing ever exposed it to the browser, so the
 * UI had no way to show WHO is doing the work, only a raw ExecutiveId string. That's what made
 * the whole screen read as one undifferentiated mandate box: Patel (the Growth executive) was
 * always fully present in the data, just never rendered anywhere.
 *
 * Read-only, no founder-specific data — the roster is the same for every founder. verifyAuth() is
 * kept anyway for consistency with every other route in this feature, not because the data needs
 * per-founder scoping.
 */

import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { listExecutives } from '@/lib/registry'
import { log } from '@/lib/logger'

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // Drop systemPromptRef/inheritsFrom — internal Composer plumbing, not the founder's business.
    const executives = listExecutives().map(e => ({
      id: e.id,
      name: e.name,
      motto: e.motto,
      domains: e.domains,
      programs: e.programs,
    }))

    return NextResponse.json({ executives })
  } catch (err) {
    log.error('GET /api/executives', { err })
    return NextResponse.json({ error: 'Failed to load the executive roster' }, { status: 500 })
  }
}
