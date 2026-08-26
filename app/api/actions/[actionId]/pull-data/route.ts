/**
 * POST /api/actions/:actionId/pull-data — the founder-triggered pull, and the ONLY place in this
 * product that calls Gmail-read or PostHog to fill `founder_pulled_data`.
 *
 * ⚠️ FOUNDER-TRIGGERED ONLY, ON PURPOSE. `lib/rhythm/run.ts`'s `pulledDataContextFor` only ever
 * reads the cache this route writes — it never calls a Connector itself, so a Rhythm cycle step
 * never makes a live external call (ADR-026). Wiring a Connector into the cycle directly would be
 * the "autonomous external signal" decision those connectors' own docstrings say is deferred;
 * this route is the founder-triggered alternative, not a reopening of that decision.
 *
 * Thin: validate → resolve grant → call the connector's existing on-demand function → cache →
 * return (CLAUDE.md §2). No new Connector logic lives here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { PULL_SOURCES } from '@/lib/actions/pulled-data'
import { resolveGrant } from '@/lib/connectors/grants'
import { searchGmailThreads } from '@/lib/connectors/gmail/read'
import { queryPostHogTrends } from '@/lib/connectors/posthog/connector'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'

const bodySchema = z.object({
  /** Free-text, passed straight through to the connector's own search/query function. */
  query: z.string().trim().min(1).max(300).optional(),
})

/** No query-builder — one sensible default per Action, overridable by the founder. */
const DEFAULT_QUERY: Record<string, string> = {
  monitor_and_classify_responses: 'replies in the last 14 days',
  monitor_lead_generation: 'lead generation trends this month',
}

function renderGmailThreads(threads: Awaited<ReturnType<typeof searchGmailThreads>>): string {
  if (threads.length === 0) return 'No matching threads found.'
  return threads
    .map(t => `- ${t.subject ?? '(no subject)'}${t.snippet ? ` — ${t.snippet}` : ''}`)
    .join('\n')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const { actionId } = await params
    const provider = PULL_SOURCES[actionId]
    if (!provider) return NextResponse.json({ error: `'${actionId}' does not accept a data pull` }, { status: 404 })

    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const query = parsed.data.query ?? DEFAULT_QUERY[actionId]

    const admin = createAdminClient()
    const grant = await resolveGrant(admin, auth.user.id, provider)

    const content = provider === 'gmail_read'
      ? renderGmailThreads(await searchGmailThreads(grant, query))
      : JSON.stringify((await queryPostHogTrends(grant, query)).data, null, 2)

    const pulledAt = new Date().toISOString()
    const { error } = await admin
      .from('founder_pulled_data')
      .upsert(
        { founder_id: auth.user.id, action_id: actionId, provider, query, content, pulled_at: pulledAt },
        { onConflict: 'founder_id,action_id' },
      )
    if (error) throw error

    return NextResponse.json({ pulledAt, query })
  } catch (err) {
    if (err instanceof ConnectorError) {
      const status = err.code === 'not_connected' ? 404 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('POST /api/actions/[actionId]/pull-data', { err })
    return NextResponse.json({ error: 'Pull failed' }, { status: 500 })
  }
}
