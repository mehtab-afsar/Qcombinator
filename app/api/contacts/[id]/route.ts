/**
 * DELETE /api/contacts/[id] — remove one of the founder's own contacts.
 *
 * RLS (`auth.uid() = founder_id`) already scopes this to the caller's own rows; the explicit
 * `.eq('founder_id', ...)` below is defense-in-depth, same style as the investor
 * portfolio-companies [id] route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

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
      .from('founder_contacts')
      .delete()
      .eq('id', id)
      .eq('founder_id', auth.user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/contacts/[id]', { err })
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
