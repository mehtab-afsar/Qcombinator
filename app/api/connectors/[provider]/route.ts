/**
 * DELETE /api/connectors/:provider — disconnect.
 *
 * Generic, like the oauth route: a second provider needs no new route (the Story 3 DoD).
 *
 * ⚠️ Revocation is a ROUTE, not a table write. `connector_grants` is read-only for authenticated
 * by design — otherwise a row could be marked 'revoked' while the token remained live at Google.
 * lib/connectors/grants.revokeGrant tells the PROVIDER first, and aborts if that fails.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { revokeGrant } from '@/lib/connectors/grants'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'
import { trackConnectorRevoked } from '@/lib/analytics'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { provider } = await params
    // Service-role: the grant table is read-only for authenticated. revokeGrant scopes every
    // query to founderId explicitly, because this client bypasses RLS.
    await revokeGrant(createAdminClient(), auth.user.id, provider)

    trackConnectorRevoked(auth.user.id, { provider })

    return NextResponse.json({ revoked: provider })
  } catch (err) {
    if (err instanceof ConnectorError) {
      // 404 when there was nothing connected; 502 when the PROVIDER refused — that distinction
      // matters, because the second means the token may still be live at Google.
      const status = err.code === 'not_connected' ? 404 : 502
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('DELETE /api/connectors/[provider]', { err })
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
