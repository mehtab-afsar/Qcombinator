/**
 * GET /api/connectors/gmail/callback — where Google sends the founder back.
 *
 * ⚠️ THE CSRF GATE. `state` is verified BEFORE the code is exchanged, and the founder id comes
 * from inside the signed state — never from the session, and never from a query parameter.
 *
 * Why that matters concretely: without it, an attacker can hand a founder a crafted link that
 * attaches the ATTACKER's Google account to the FOUNDER's workspace. The founder's Programs
 * would then send mail through an inbox they do not control, and every audit row would look
 * perfectly normal.
 *
 * This is a browser redirect target, so it returns redirects with a readable reason rather than
 * JSON — the founder lands back on their Command View either way.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { newModelOff } from '@/lib/api/response'
import { getConnector } from '@/lib/connectors/registry'
import { exchangeCode, verifyState } from '@/lib/connectors/oauth'
import { recordGrant } from '@/lib/connectors/grants'
import { ConnectorError } from '@/lib/connectors/types'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

const BACK_TO = `${env.appUrl}/founder/executive`

function back(status: string): NextResponse {
  return NextResponse.redirect(`${BACK_TO}?connector=${encodeURIComponent(status)}`)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // The founder pressed Cancel on Google's consent screen. Not an error — say so plainly.
  if (url.searchParams.get('error')) return back('cancelled')
  if (!code || !state) return back('invalid')

  try {
    // FIRST. Nothing is exchanged or stored until the state proves who this is for.
    const { founderId } = verifyState(state)
    const connector = getConnector('gmail')
    const tokens = await exchangeCode(code, connector.scopes)

    await recordGrant(createAdminClient(), {
      founderId,
      provider: 'gmail',
      refreshToken: tokens.refreshToken,
      scopes: tokens.grantedScopes,
      accountEmail: tokens.accountEmail,
      expiresAt: tokens.expiresAt,
    })

    log.info('gmail connected', { founderId }) // never the tokens, never the code
    return back('connected')
  } catch (err) {
    if (err instanceof ConnectorError) {
      log.warn('gmail connect refused', { code: err.code }) // the code, not the payload
      return back(err.code)
    }
    log.error('GET /api/connectors/gmail/callback', { err })
    return back('failed')
  }
}
