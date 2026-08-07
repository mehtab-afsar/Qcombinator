/**
 * POST /api/connectors/:provider/oauth — start the connect flow.
 *
 * GENERIC on purpose. The PRD specifies `:provider`; three other documents say `gmail`. The
 * generic form is right, because the Story 3 DoD requires that **a second provider needs no new
 * route** — and a per-provider route fails that on the day a CRM arrives.
 *
 * Returns a URL rather than redirecting: the caller is a fetch from the Command View, and a 302
 * to Google from an XHR is not something a browser can follow usefully.
 *
 * Thin: validate → build the URL → return (CLAUDE.md §2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { getConnector } from '@/lib/connectors/registry'
import { getOAuthProvider } from '@/lib/connectors/oauth-provider'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { provider } = await params
    // Scopes come from the connector, not the request. A client-supplied scope list would let a
    // caller widen what the system may do with a founder's account.
    const connector = getConnector(provider)

    return NextResponse.json({ url: getOAuthProvider(provider).authorizeUrl(auth.user.id, connector.scopes) })
  } catch (err) {
    if (err instanceof ConnectorError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    log.error('POST /api/connectors/[provider]/oauth', { err })
    return NextResponse.json({ error: 'Could not start the connection' }, { status: 500 })
  }
}
