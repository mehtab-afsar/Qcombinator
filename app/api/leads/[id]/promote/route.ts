/**
 * POST /api/leads/[id]/promote — turn an enriched lead into a real contact.
 *
 * ⚠️ THIS IS THE ONE BRIDGE BETWEEN RESEARCH AND OUTREACH, and it is deliberately a founder's
 * explicit click. founder_contacts is the sole recipient source fed into Company Context for a
 * Gmail-send Action (lib/contacts/context.ts), and generate.ts's `assertRecipientsInContext`
 * refuses any payload naming someone outside it — the mitigation ROADMAP_STATUS.md calls the
 * largest unmitigated risk in Story 3. That guard assumes every contact is someone the founder
 * vouched for. This route is where the vouching happens.
 *
 * Two invariants therefore hold here and must keep holding:
 *   1. Nothing else, anywhere, may write a lead into founder_contacts.
 *   2. A lead with an unverified email can never be promoted — an unverified address is exactly
 *      the fabrication the guard exists to catch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { log } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const supabase = await createClient()

    const { data: lead, error: readError } = await supabase
      .from('founder_leads')
      .select('id, company, title, contact_name, email, email_status, promoted_at')
      .eq('id', id)
      .eq('founder_id', auth.user.id)
      .maybeSingle()

    if (readError) throw readError
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Invariant 2. An unverified address must never reach the contacts list, because everything
    // downstream treats a contact as founder-vouched fact.
    if (lead.email_status !== 'verified' || !lead.email) {
      return NextResponse.json(
        { error: 'This lead has no verified email yet — find its email before adding it to contacts.' },
        { status: 400 },
      )
    }

    const { data: contact, error: insertError } = await supabase
      .from('founder_contacts')
      .insert({
        founder_id: auth.user.id,
        name: (lead.contact_name as string | null) ?? (lead.email as string),
        email: lead.email as string,
        company: (lead.company as string | null) ?? null,
        title: (lead.title as string | null) ?? null,
        notes: 'Promoted from a researched lead.',
      })
      .select('id, name, email, company, title, notes, created_at')
      .single()

    if (insertError) {
      // The (founder_id, lower(email)) unique index — already a contact. Stamp the lead anyway so
      // the button stops offering work that is genuinely already done.
      if (insertError.code === '23505') {
        await supabase
          .from('founder_leads')
          .update({ promoted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('founder_id', auth.user.id)
        return NextResponse.json({ error: 'That email is already in your contacts' }, { status: 409 })
      }
      throw insertError
    }

    const { error: stampError } = await supabase
      .from('founder_leads')
      .update({ promoted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('founder_id', auth.user.id)
    if (stampError) {
      // The contact exists, which is the meaningful outcome — a failed stamp only means the UI
      // may offer the button again, and the unique index makes that harmless.
      log.warn('promote: contact created but lead stamp failed', { leadId: id, err: stampError.message })
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (err) {
    log.error('POST /api/leads/[id]/promote', { err })
    return NextResponse.json({ error: 'Could not add that lead to your contacts' }, { status: 500 })
  }
}
