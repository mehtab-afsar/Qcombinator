/**
 * POST /api/leads/enrich — find real names and work emails for researched leads, via Apollo.
 *
 * ⚠️ FOUNDER-TRIGGERED, AND THAT IS THE APPROVAL. Every call here spends the founder's Apollo
 * credits, and ADR-004 names *spend* among the irreversible acts needing a just-in-time
 * checkpoint. The founder clicking this button, having been shown the estimated cost, IS that
 * checkpoint — which is why enrichment is not an Action and nothing in the Operating Rhythm may
 * reach it. Making it autonomous later means revisiting ADR-004, not importing this module.
 *
 * ⚠️ Enriching a lead does NOT make it emailable. founder_contacts remains the only recipient
 * source; a lead becomes a contact only through the explicit promote route. See the
 * founder_leads migration header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { resolveGrant } from '@/lib/connectors/grants'
import { enrichLeads, type EnrichableLead } from '@/lib/connectors/apollo/connector'
import { ConnectorError } from '@/lib/connectors/types'
import { log } from '@/lib/logger'

/**
 * A hard ceiling on one click. Enrichment costs roughly two Apollo credits per lead, so an
 * unbounded request is an unbounded bill — and a mis-click should never be able to spend
 * hundreds of dollars of someone's credits.
 */
const MAX_PER_REQUEST = 25

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, 'Select at least one lead').max(MAX_PER_REQUEST,
    `You can enrich at most ${MAX_PER_REQUEST} leads at a time`),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // User-scoped read: RLS decides which of these ids are actually the caller's. An id belonging
    // to someone else simply doesn't come back, so it can never be enriched or written.
    const supabase = await createClient()
    const { data: rows, error: readError } = await supabase
      .from('founder_leads')
      .select('id, company, title, apollo_org_id')
      .in('id', parsed.data.leadIds)
      // Already-enriched leads are skipped rather than re-paid for.
      .eq('email_status', 'none')

    if (readError) throw readError
    if (!rows || rows.length === 0) {
      return NextResponse.json({ enriched: 0, results: [], message: 'Nothing to enrich' })
    }

    const leads: EnrichableLead[] = rows.map(r => ({
      id: r.id as string,
      company: r.company as string,
      title: (r.title as string | null) ?? null,
      apolloOrgId: (r.apollo_org_id as string | null) ?? null,
    }))

    const grant = await resolveGrant(createAdminClient(), auth.user.id, 'apollo')
    const results = await enrichLeads(grant, leads)

    // Write back per lead. Sequential and individually scoped — one failed write must not lose
    // the other results, all of which have already been paid for in credits.
    let enriched = 0
    for (const r of results) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (r.apolloOrgId) patch.apollo_org_id = r.apolloOrgId
      if (r.apolloPersonId) patch.apollo_person_id = r.apolloPersonId
      if (r.outcome === 'found') {
        patch.contact_name = r.contactName
        patch.email = r.email
        patch.email_status = 'verified'
        enriched++
      }
      const { error: writeError } = await supabase
        .from('founder_leads')
        .update(patch)
        .eq('id', r.leadId)
        .eq('founder_id', auth.user.id)
      if (writeError) {
        log.warn('enrichment write-back failed', { leadId: r.leadId, err: writeError.message })
      }
    }

    return NextResponse.json({ enriched, attempted: results.length, results })
  } catch (err) {
    if (err instanceof ConnectorError) {
      const status = err.code === 'not_connected' ? 404 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    log.error('POST /api/leads/enrich', { err })
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
