/**
 * GET /api/connectors/:provider/callback — where the provider sends the founder back.
 *
 * GENERIC, replacing what was `app/api/connectors/gmail/callback/route.ts`. Next's `[provider]`
 * segment still serves the literal URL `/api/connectors/gmail/callback` when `provider ===
 * 'gmail'` — the deployed callback URL for Gmail does not change, so nothing needs re-registering
 * in Google Cloud Console.
 *
 * ⚠️ THE CSRF GATE. `state` is verified BEFORE the code is exchanged, and the founder id comes
 * from inside the signed state — never from the session, and never from a query parameter.
 *
 * Why that matters concretely: without it, an attacker can hand a founder a crafted link that
 * attaches the ATTACKER's account to the FOUNDER's workspace. The founder's Programs would then
 * act through an account they do not control, and every audit row would look perfectly normal.
 *
 * This is a browser redirect target, so it returns redirects with a readable reason rather than
 * JSON — the founder lands back on their Command View either way.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { newModelOff } from '@/lib/api/response'
import { getConnector } from '@/lib/connectors/registry'
import { getOAuthProvider } from '@/lib/connectors/oauth-provider'
import { recordGrant } from '@/lib/connectors/grants'
import { ConnectorError } from '@/lib/connectors/types'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'
import { trackConnectorConnected } from '@/lib/analytics'

const BACK_TO = `${env.appUrl}/founder/executive`

function back(status: string): NextResponse {
  return NextResponse.redirect(`${BACK_TO}?connector=${encodeURIComponent(status)}`)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  const { provider } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // The founder pressed Cancel on the provider's consent screen. Not an error — say so plainly.
  if (url.searchParams.get('error')) return back('cancelled')
  if (!code || !state) return back('invalid')

  try {
    const oauthProvider = getOAuthProvider(provider)

    // FIRST. Nothing is exchanged or stored until the state proves who this is for.
    const { founderId } = oauthProvider.verifyState(state)
    const connector = getConnector(provider)
    const tokens = await oauthProvider.exchangeCode(code, connector.scopes)

    await recordGrant(createAdminClient(), {
      founderId,
      provider,
      refreshToken: tokens.refreshToken,
      scopes: tokens.grantedScopes,
      accountEmail: tokens.accountEmail,
      expiresAt: tokens.expiresAt,
    })

    trackConnectorConnected(founderId, { provider })
    log.info(`${provider} connected`, { founderId }) // never the tokens, never the code
    return back('connected')
  } catch (err) {
    if (err instanceof ConnectorError) {
      log.warn(`${provider} connect refused`, { code: err.code }) // the code, not the payload
      return back(err.code)
    }
    log.error('GET /api/connectors/[provider]/callback', { err })
    return back('failed')
  }
}
