/**
 * POST /api/connectors/apollo/key — connect Apollo by pasting an API key.
 *
 * ⚠️ A DELIBERATE EXCEPTION TO ADR-021's "a second provider needs no new route." That rule holds
 * because every provider so far speaks OAuth, and the generic
 * `app/api/connectors/[provider]/{oauth,callback}` pair covers the whole handshake. Apollo has no
 * handshake — the founder holds a key and hands it over — so there is no code for the generic
 * routes to run. This is the narrowest possible exception: one route, one provider, and it ends
 * in the same `recordGrant` every OAuth callback ends in. If a second key-based provider ever
 * lands, generalise this into `[provider]/key` rather than copying it.
 *
 * The key is VERIFIED against Apollo before it is stored. Storing an invalid key would produce a
 * connection that looks healthy in the UI and fails at the moment the founder actually spends
 * credits — the worst time to discover it.
 *
 * BYOK: this is the founder's own Apollo account, so their credits, their plan limits, and their
 * terms-of-service relationship with Apollo. We never hold a shared key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { recordGrant } from '@/lib/connectors/grants'
import { getConnector } from '@/lib/connectors/registry'
import { verifyApolloKey } from '@/lib/connectors/apollo/connector'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'

const bodySchema = z.object({
  // Apollo keys are opaque; bound the length rather than pattern-match a format they may change.
  apiKey: z.string().trim().min(10, 'That does not look like an Apollo API key').max(200),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const valid = await verifyApolloKey(parsed.data.apiKey)
    if (!valid) {
      return NextResponse.json(
        { error: 'Apollo rejected that key. Check it in Apollo under Settings → Integrations → API.' },
        { status: 400 },
      )
    }

    // Same terminus as every OAuth callback: vault first, then the grant row. `refreshToken` is
    // just "the durable credential" — for Apollo that is the key itself (see apollo/oauth.ts).
    const grant = await recordGrant(createAdminClient(), {
      founderId: auth.user.id,
      provider: 'apollo',
      refreshToken: parsed.data.apiKey,
      scopes: [...getConnector('apollo').scopes],
      accountEmail: null,
    })

    return NextResponse.json({ connected: true, provider: grant.provider }, { status: 201 })
  } catch (err) {
    if (err instanceof ConnectorError) {
      const status = err.code === 'already_connected' ? 409 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('POST /api/connectors/apollo/key', { err })
    return NextResponse.json({ error: 'Could not connect Apollo' }, { status: 500 })
  }
}
