/**
 * GET  /api/contacts — the founder's own contact list.
 * POST /api/contacts — add one contact.
 *
 * The AI SDR's real recipient source (see lib/contacts/context.ts, lib/rhythm/run.ts's
 * founderContactsContextFor). Thin by design: validate → write → return (CLAUDE.md §2).
 *
 * User-scoped client, on purpose — RLS is the tenancy boundary here, same deliberate choice as
 * app/api/strategy/route.ts: "the service role would bypass exactly the guarantee we want."
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { founderContactPostSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

// Matches the existing portfolio-companies import's own cap (app/api/investor/portfolio-companies
// /import/route.ts). Not a security boundary — a sanity limit on how much real PII lands in every
// Gmail-send Action's prompt at once.
const MAX_CONTACTS_PER_FOUNDER = 200

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('founder_contacts')
      .select('id, name, email, company, title, notes, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ contacts: data ?? [] })
  } catch (err) {
    log.error('GET /api/contacts', { err })
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, founderContactPostSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()

    const { count, error: countError } = await supabase
      .from('founder_contacts')
      .select('id', { count: 'exact', head: true })
    if (countError) throw countError
    if ((count ?? 0) >= MAX_CONTACTS_PER_FOUNDER) {
      return NextResponse.json(
        { error: `You can have at most ${MAX_CONTACTS_PER_FOUNDER} contacts` },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('founder_contacts')
      .insert({
        founder_id: auth.user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company ?? null,
        title: parsed.data.title ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select('id, name, email, company, title, notes, created_at')
      .single()

    if (error) {
      // The (founder_id, lower(email)) unique index — a founder re-adding the same address.
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You already have a contact with this email' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ contact: data }, { status: 201 })
  } catch (err) {
    log.error('POST /api/contacts', { err })
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}
