/**
 * GET  /api/leads — the founder's researched lead pipeline.
 * POST /api/leads — add one lead by hand.
 *
 * The founder-facing half of the spine's first entity (docs/AGI_ACTIONS_PRD.md). The AI writes
 * these rows through lib/entities/leads.ts during a cycle; this is where the founder reads,
 * adds to, and corrects them.
 *
 * ⚠️ These are NOT email recipients. Only founder_contacts feeds Company Context for a
 * Gmail-send Action — see the founder_leads migration header for why that separation is
 * load-bearing rather than incidental.
 *
 * User-scoped client, on purpose — RLS is the tenancy boundary here, same deliberate choice as
 * app/api/contacts/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, founderLeadPostSchema } from '@/lib/api/validate'
import { dedupeKey } from '@/lib/entities/leads'
import { log } from '@/lib/logger'

/** Mirrors MAX_CONTACTS_PER_FOUNDER's reasoning — a sanity limit, not a security boundary. */
const MAX_LEADS_PER_FOUNDER = 1_000

const SELECT = 'id, company, title, contact_name, email, email_status, score, rationale, status, source, notes, created_at'

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('founder_leads')
      .select(SELECT)
      // Highest-scored first — the ranking is the point of the list. Unscored rows sort last
      // rather than first, matching the founder_leads_founder_recent index.
      .order('score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ leads: data ?? [] })
  } catch (err) {
    log.error('GET /api/leads', { err })
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, founderLeadPostSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()

    const { count, error: countError } = await supabase
      .from('founder_leads')
      .select('id', { count: 'exact', head: true })
    if (countError) throw countError
    if ((count ?? 0) >= MAX_LEADS_PER_FOUNDER) {
      return NextResponse.json(
        { error: `You can have at most ${MAX_LEADS_PER_FOUNDER} leads` },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('founder_leads')
      .insert({
        founder_id: auth.user.id,
        company: parsed.data.company,
        title: parsed.data.title ?? null,
        notes: parsed.data.notes ?? null,
        // A founder-added lead is theirs, not the AI's — the provenance matters when deciding
        // later whether a row is trustworthy enough to promote to a contact.
        source: 'founder',
        dedupe_key: dedupeKey(parsed.data.company, parsed.data.title),
      })
      .select(SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You already have this lead' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ lead: data }, { status: 201 })
  } catch (err) {
    log.error('POST /api/leads', { err })
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 })
  }
}
