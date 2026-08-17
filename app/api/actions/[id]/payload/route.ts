/**
 * GET /api/actions/:id/payload — the real content of one pending Action, for the founder to
 * actually read before approving it.
 *
 * Closes a real gap: until this route existed, nothing ever showed the founder more than
 * recipient count/domain and subject length — "approving" meant consenting to a redacted
 * summary, never the actual message. This resolves the real payload from Vault (see
 * lib/actions/payload-vault.ts) on demand, scoped to this founder's own pending action, never
 * exposed via a client-side Supabase query.
 *
 * Only ever returns content for a row still `pending_approval` — once decided (approved,
 * declined) or executed, the transient copy is deleted (lib/actions/approve.ts,
 * lib/actions/execute.ts) and this 404s honestly rather than returning stale content.
 *
 * Thin: authenticate → check ownership → resolve → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { resolvePayload } from '@/lib/actions/payload-vault'
import { VaultError } from '@/lib/connectors/vault'
import { log } from '@/lib/logger'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    // Service-role: the founder never gets a raw Supabase query anywhere near this table or the
    // vault — every read is mediated by this route, which checks ownership first.
    const admin = createAdminClient()
    const anchorId = await getAnchorFounderId(auth.user.id, admin)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const { data, error } = await admin
      .from('action_log')
      .select('id, payload_ref, status')
      .eq('id', id)
      .eq('founder_id', anchorId) // scoped in the query — this client bypasses RLS
      .maybeSingle()

    if (error) {
      log.error('GET /api/actions/[id]/payload — read failed', { err: error.message })
      return NextResponse.json({ error: 'Could not load this action.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'That action does not exist.' }, { status: 404 })
    if (data.status !== 'pending_approval' || !data.payload_ref) {
      // Already decided, already sent, or never had real content (a reversible Action) — the
      // transient copy is gone by design, not an error state.
      return NextResponse.json({ error: 'This content is no longer available.' }, { status: 404 })
    }

    const payload = await resolvePayload(admin, data.payload_ref)
    return NextResponse.json({ payload })
  } catch (err) {
    if (err instanceof VaultError) {
      return NextResponse.json({ error: 'Could not read the stored content.' }, { status: 404 })
    }
    log.error('GET /api/actions/[id]/payload', { err })
    return NextResponse.json({ error: 'Could not load this action.' }, { status: 500 })
  }
}
