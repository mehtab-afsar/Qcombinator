/**
 * PATCH  /api/leads/[id] — move a lead's status, or edit its notes.
 * DELETE /api/leads/[id] — remove one of the founder's own leads.
 *
 * PATCH exists here where the contacts route has no equivalent, because a lead genuinely has a
 * lifecycle (researched → contacted → replied → qualified/dead) that the founder drives. A
 * contact does not — see the founder_contacts migration header on why status has no business
 * living there.
 *
 * RLS (`auth.uid() = founder_id`) already scopes both to the caller's own rows; the explicit
 * `.eq('founder_id', ...)` is defense-in-depth, same style as app/api/contacts/[id]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, founderLeadPatchSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'

const SELECT = 'id, company, title, contact_name, email, email_status, score, rationale, status, source, notes, created_at'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, founderLeadPatchSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('founder_leads')
      .update({
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('founder_id', auth.user.id)
      .select(SELECT)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ lead: data })
  } catch (err) {
    log.error('PATCH /api/leads/[id]', { err })
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase
      .from('founder_leads')
      .delete()
      .eq('id', id)
      .eq('founder_id', auth.user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/leads/[id]', { err })
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
